import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createClient } from 'webdav';
import { Client as FtpClient } from 'basic-ftp';
import path from 'path';
import fs from 'fs/promises';
import { ImportSource } from './entities/import-source.entity';
import { ImageAsset } from './entities/image-asset.entity';
import { AssetClassification } from './entities/asset-classification.entity';
import { ImageProcessingService } from './image-processing.service';
import { OcrService } from './ocr.service';
import { ImageRecognitionService } from './image-recognition.service';
import { SettingsService } from '../settings/settings.service';
import { Part } from '../parts/entities/part.entity';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv']);
const ALL_MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

interface RemoteFile {
  path: string;
  name: string;
  size: number;
  oeHint?: string; // OE number inferred from parent folder
}

@Injectable()
export class ImportSourcesService {
  private readonly logger = new Logger(ImportSourcesService.name);
  private isScanning = false;
  private stopFlags = new Map<number, boolean>();
  private oeLookupCache = new Map<string, { partNameCn: string; partNameEn: string; brand: string; partType: string }>();

  constructor(
    @InjectRepository(ImportSource) private sourceRepo: Repository<ImportSource>,
    @InjectRepository(ImageAsset) private assetRepo: Repository<ImageAsset>,
    @InjectRepository(AssetClassification) private classRepo: Repository<AssetClassification>,
    @InjectRepository(Part) private partRepo: Repository<Part>,
    private imageProcessing: ImageProcessingService,
    private ocrService: OcrService,
    private recognitionService: ImageRecognitionService,
    private settingsSvc: SettingsService,
  ) {}

  // ---- CRUD ----
  async findAll() {
    return this.sourceRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const source = await this.sourceRepo.findOne({ where: { id } });
    if (!source) throw new NotFoundException('导入源不存在');
    return source;
  }

  async create(data: Partial<ImportSource>) {
    const source = this.sourceRepo.create(data);
    return this.sourceRepo.save(source);
  }

  async update(id: number, data: Partial<ImportSource>) {
    const source = await this.findOne(id);
    Object.assign(source, data);
    return this.sourceRepo.save(source);
  }

  async remove(id: number) {
    const source = await this.findOne(id);
    await this.sourceRepo.remove(source);
  }

  // ---- Scheduled Auto-Scan ----
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledScans() {
    if (this.isScanning) return;

    try {
      this.isScanning = true;
      const now = new Date();
      const sources = await this.sourceRepo.find({
        where: { scanInterval: MoreThan(0), status: 'idle' },
      });

      for (const source of sources) {
        try {
          const lastScan = source.lastScanAt || new Date(0);
          const minutesSinceLastScan = (now.getTime() - lastScan.getTime()) / (1000 * 60);

          if (minutesSinceLastScan >= source.scanInterval) {
            this.logger.log(`Auto-scanning source: ${source.name} (interval: ${source.scanInterval} min)`);
            await this.sourceRepo.update(source.id, { lastScanAt: now });
            await this.runImport(source.id);
          }
        } catch (error) {
          this.logger.error(`Auto-scan failed for source ${source.name}: ${error.message}`);
        }
      }
    } finally {
      this.isScanning = false;
    }
  }

  // ---- Test Connection ----
  async testConnection(id: number): Promise<{ success: boolean; message: string; fileCount?: number; totalFiles?: number; sampleFiles?: string[] }> {
    const source = await this.findOne(id);
    try {
      const timeout = 15000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('连接超时')), timeout);
      });

      const testPromise = this.listRemoteFiles(source);
      const files = await Promise.race([testPromise, timeoutPromise]) as RemoteFile[];

      const mediaFiles = files.filter(f => ALL_MEDIA_EXTENSIONS.has(path.extname(f.name).toLowerCase()));
      const sample = files.slice(0, 5).map(f => f.name);
      this.logger.log(`[TestConn] url=${source.url}, remotePath=${source.remotePath}, totalFiles=${files.length}, media=${mediaFiles.length}`);
      return { success: true, message: `连接成功，共 ${files.length} 个文件，${mediaFiles.length} 个媒体文件`, fileCount: mediaFiles.length, totalFiles: files.length, sampleFiles: sample };
    } catch (error) {
      this.logger.error(`Test connection failed for source ${id}:`, error);
      let message = '连接失败';
      if (error.message?.includes('超时')) message = '连接超时，请检查网络和URL';
      else if (error.message?.includes('401') || error.message?.includes('403')) message = '认证失败，请检查用户名和密码';
      else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) message = '无法连接到服务器，请检查 URL';
      else message = `连接失败: ${error.message}`;
      return { success: false, message };
    }
  }

  // ---- Browse Directory ----
  async browseDirectory(sourceId: number, dirPath: string): Promise<{ path: string; name: string; isDirectory: boolean; size?: number }[]> {
    const source = await this.findOne(sourceId);
    const items: { path: string; name: string; isDirectory: boolean; size?: number }[] = [];

    try {
      switch (source.protocol) {
        case 'webdav': {
          let webdavUrl = source.url;
          if (!webdavUrl.endsWith('/')) webdavUrl += '/';
          const client = createClient(webdavUrl, {
            username: source.username,
            password: source.password,
            headers: { 'User-Agent': 'CarParts-Asset-Manager/1.0' },
          });
          const contents = await client.getDirectoryContents(dirPath) as any[];
          for (const item of contents) {
            items.push({
              path: item.filename,
              name: item.basename,
              isDirectory: item.type === 'directory',
              size: item.type === 'file' ? item.size : undefined,
            });
          }
          break;
        }
        case 'ftp': {
          const ftpClient = new FtpClient();
          try {
            await ftpClient.access({
              host: new URL(source.url).hostname,
              port: parseInt(new URL(source.url).port) || 21,
              user: source.username,
              password: source.password,
              secure: source.url.startsWith('ftps'),
            });
            const list = await ftpClient.list(dirPath);
            for (const item of list) {
              const fullPath = `${dirPath}/${item.name}`.replace(/\/+/g, '/');
              items.push({
                path: fullPath,
                name: item.name,
                isDirectory: item.isDirectory,
                size: item.isFile ? item.size : undefined,
              });
            }
          } finally {
            ftpClient.close();
          }
          break;
        }
        case 'smb_mount': {
          const baseDir = path.join(source.localMountPath, dirPath);
          const entries = await fs.readdir(baseDir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            items.push({
              path: fullPath,
              name: entry.name,
              isDirectory: entry.isDirectory(),
              size: entry.isFile() ? (await fs.stat(path.join(baseDir, entry.name))).size : undefined,
            });
          }
          break;
        }
        default:
          throw new Error(`不支持的协议: ${source.protocol}`);
      }

      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return items;
    } catch (error) {
      this.logger.error(`Browse directory failed:`, error);
      throw new Error(`无法浏览目录: ${error.message}`);
    }
  }

  // ---- Import Control ----
  async startImport(sourceId: number): Promise<{ message: string }> {
    const source = await this.findOne(sourceId);
    if (source.status === 'importing' || source.status === 'scanning') {
      throw new Error('导入正在进行中');
    }

    this.stopFlags.delete(sourceId);
    this.runImport(sourceId).catch(err => {
      this.logger.error(`[Import] Background import failed for source ${sourceId}: ${err.message}`);
    });

    return { message: '导入已开始' };
  }

  async stopImport(sourceId: number): Promise<{ message: string }> {
    const source = await this.findOne(sourceId);
    if (source.status !== 'importing' && source.status !== 'scanning') {
      throw new Error('当前没有正在进行的导入');
    }

    this.stopFlags.set(sourceId, true);
    this.logger.log(`[Import] Stop requested for source ${sourceId}`);
    return { message: '正在停止导入...' };
  }

  async getImportProgress(sourceId: number) {
    const source = await this.findOne(sourceId);
    return {
      status: source.status,
      progress: source.importProgress,
      errorMessage: source.errorMessage,
      lastSyncAt: source.lastSyncAt,
    };
  }

  // ---- Main Import Logic ----
  private async runImport(sourceId: number) {
    const source = await this.findOne(sourceId);

    await this.sourceRepo.update(sourceId, {
      status: 'scanning',
      errorMessage: '',
      importProgress: { imported: 0, skipped: 0, errors: 0, total: 0, currentFile: '正在扫描目录...' },
    });

    try {
      const remoteFiles = await this.listRemoteFiles(source);
      const mediaFiles = remoteFiles.filter(f => ALL_MEDIA_EXTENSIONS.has(path.extname(f.name).toLowerCase()));
      this.logger.log(`[Import] Source "${source.name}": ${remoteFiles.length} total files, ${mediaFiles.length} media files`);

      if (mediaFiles.length === 0) {
        await this.sourceRepo.update(sourceId, {
          status: 'idle',
          lastSyncAt: new Date(),
          importProgress: null,
          errorMessage: `扫描完成，未找到媒体文件（共 ${remoteFiles.length} 个文件）`,
        });
        return;
      }

      const fileLog: any[] = [];
      await this.sourceRepo.update(sourceId, {
        status: 'importing',
        importProgress: { imported: 0, skipped: 0, errors: 0, total: mediaFiles.length, currentFile: '', fileLog },
      });

      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < mediaFiles.length; i++) {
        // Check stop flag
        if (this.stopFlags.has(sourceId)) {
          this.stopFlags.delete(sourceId);
          this.logger.log(`[Import] Stopped by user for source ${sourceId}`);
          await this.sourceRepo.update(sourceId, {
            status: 'idle',
            lastSyncAt: new Date(),
            importProgress: { imported, skipped, errors, total: mediaFiles.length, currentFile: '', fileLog: fileLog.slice(-100) },
            errorMessage: `用户停止，已导入 ${imported} 个`,
          });
          return;
        }

        const file = mediaFiles[i];
        const isVideo = VIDEO_EXTENSIONS.has(path.extname(file.name).toLowerCase());
        try {
          // Update progress with fileLog
          await this.sourceRepo.update(sourceId, {
            importProgress: { imported, skipped, errors, total: mediaFiles.length, currentFile: file.name, fileLog: fileLog.slice(-100) },
          });

          // Check if already imported: same fileName + same OE number = true duplicate
          const oeHint = file.oeHint;
          if (oeHint) {
            const dup = await this.assetRepo.findOne({ where: { fileName: file.name, recognizedOeNumber: oeHint } });
            if (dup) {
              skipped++;
              fileLog.push({ name: file.name, oe: oeHint, status: 'skip', error: '' });
              continue;
            }
          } else {
            const dup = await this.assetRepo.findOne({ where: { fileName: file.name } });
            if (dup) {
              skipped++;
              fileLog.push({ name: file.name, oe: '', status: 'skip', error: '' });
              continue;
            }
          }

          // Download file with retry
          this.logger.log(`[Import] Downloading: ${file.name} (${file.size} bytes)`);
          const buffer = await this.downloadWithRetry(source, file.path, 3);
          this.logger.log(`[Import] Downloaded: ${file.name}, buffer size: ${buffer.length} bytes`);

          // Determine OE number: folder-level hint takes priority
          const nameWithoutExt = path.basename(file.name, path.extname(file.name));
          let oeNumber = file.oeHint || this.extractOeNumber(nameWithoutExt);
          let partId: number | undefined;
          let classificationId = this.classifyByFolder(file.path, source.folderMapping);
          let recognizedOeNumber = '';
          let recognizedPartType = '';
          let recognizedBrand = '';
          let partNameCn = '';
          let partNameEn = '';
          let recognitionStatus = isVideo ? 'skipped' : 'pending';
          let ocrStatus = isVideo ? 'skipped' : 'pending';

          if (oeNumber && !isVideo) {
            recognizedOeNumber = oeNumber;
            const part = await this.partRepo.findOne({ where: { oeNumber } });
            if (part) {
              partId = part.id;
              recognizedPartType = part.category || '';
              recognizedBrand = part.brand || '';
              partNameCn = part.partNameCn || '';
              partNameEn = part.partNameEn || '';
              recognitionStatus = 'done';
              ocrStatus = 'done';
              if (!classificationId && part.category) {
                const cls = await this.classRepo.findOne({ where: { name: part.category } });
                if (cls) classificationId = cls.id;
              }
              this.logger.log(`[Import] OE match: ${file.name} → ${part.oeNumber} (${partNameCn})`);
            } else {
              this.logger.log(`[Import] OE detected (${oeNumber}), looking up via AI: ${file.name}`);
              const aiResult = await this.lookupPartNameByOE(oeNumber);
              if (aiResult) {
                partNameCn = aiResult.partNameCn;
                partNameEn = aiResult.partNameEn;
                recognizedBrand = aiResult.brand;
                recognizedPartType = aiResult.partType;
                this.logger.log(`[Import] AI lookup: ${oeNumber} → ${partNameCn} / ${partNameEn}`);
              }
            }
          }

          let saved: { filePath: string; fileName: string; width: number; height: number; mimeType: string; duration?: number };
          let thumbnails: { small: string; medium: string; large: string };

          if (isVideo) {
            const ext = path.extname(file.name).toLowerCase();
            const mimeMap: Record<string, string> = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska', '.flv': 'video/x-flv', '.wmv': 'video/x-ms-wmv' };
            saved = await this.imageProcessing.saveVideo(buffer, file.name, mimeMap[ext] || 'video/mp4');
            const videoUuid = path.basename(saved.filePath, path.extname(saved.filePath));
            thumbnails = await this.imageProcessing.extractVideoThumbnail(
              this.imageProcessing.getAbsolutePath(saved.filePath),
              videoUuid,
            );
          } else {
            this.logger.log(`[Import] Saving original: ${file.name}`);
            saved = await this.imageProcessing.saveOriginal(buffer, file.name);
            this.logger.log(`[Import] Saved to: ${saved.filePath}`);
            const imgUuid = path.basename(saved.filePath, path.extname(saved.filePath));
            thumbnails = await this.imageProcessing.generateThumbnails(buffer, imgUuid);
            this.logger.log(`[Import] Thumbnails generated: ${JSON.stringify(thumbnails)}`);
          }

          // Create asset record
          const asset = this.assetRepo.create({
            partId: partId || undefined,
            type: isVideo ? 'video' : 'image',
            filePath: saved.filePath,
            fileName: saved.fileName,
            fileSize: file.size,
            width: saved.width,
            height: saved.height,
            mimeType: saved.mimeType,
            duration: saved.duration || 0,
            classificationId: classificationId || undefined,
            thumbnailSmallPath: thumbnails.small,
            thumbnailMediumPath: thumbnails.medium,
            thumbnailLargePath: thumbnails.large,
            ocrStatus,
            recognitionStatus,
            recognizedOeNumber,
            recognizedPartType,
            recognizedBrand,
            partNameCn,
            partNameEn,
          });
          await this.assetRepo.save(asset);

          // Background OCR/AI for non-OE image files only
          if (!partId && !isVideo) {
            this.processInBackground(asset.id, saved.filePath, source.folderMapping);
          }

          imported++;
          fileLog.push({ name: file.name, oe: recognizedOeNumber || oeNumber || '', status: 'ok', error: '' });
        } catch (err) {
          errors++;
          fileLog.push({ name: file.name, oe: file.oeHint || '', status: 'fail', error: err.message });
          this.logger.error(`[Import] Failed: ${file.name}: ${err.message}`);
        }
      }

      await this.sourceRepo.update(sourceId, {
        status: 'idle',
        lastSyncAt: new Date(),
        importProgress: { imported, skipped, errors, total: mediaFiles.length, currentFile: '', fileLog: fileLog.slice(-200) },
        errorMessage: '',
      });

      this.logger.log(`[Import] Complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    } catch (error) {
      await this.sourceRepo.update(sourceId, {
        status: 'error',
        importProgress: null,
        errorMessage: error.message,
      });
      this.logger.error(`[Import] Fatal error: ${error.message}`);
    }
  }

  // ---- Protocol handlers ----
  private async listRemoteFiles(source: ImportSource): Promise<RemoteFile[]> {
    switch (source.protocol) {
      case 'webdav':
        return this.listWebDAVFiles(source);
      case 'ftp':
        return this.listFTPFiles(source);
      case 'smb_mount':
        return this.listLocalFiles(source.localMountPath, source.remotePath || '/');
      default:
        throw new Error(`不支持的协议: ${source.protocol}`);
    }
  }

  private async listWebDAVFiles(source: ImportSource): Promise<RemoteFile[]> {
    let webdavUrl = source.url;
    if (!webdavUrl.endsWith('/')) webdavUrl += '/';

    const client = createClient(webdavUrl, {
      username: source.username,
      password: source.password,
      headers: { 'User-Agent': 'CarParts-Asset-Manager/1.0' },
    });

    const files: RemoteFile[] = [];
    const remotePath = source.remotePath || '/';

    // Extract OE number from the last segment of remotePath
    const pathSegments = remotePath.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || '';
    const rootOeHint = this.extractOeNumber(lastSegment);
    this.logger.log(`[ListWebDAV] remotePath=${remotePath}, lastSegment=${lastSegment}, rootOeHint=${rootOeHint}`);

    const scanDir = async (dirPath: string, parentOeHint?: string) => {
      // Check stop flag during scanning
      if (this.stopFlags.has(source.id)) return;

      try {
        const contents = await client.getDirectoryContents(dirPath) as any[];
        for (const item of contents) {
          if (item.type === 'directory') {
            // Check if folder name looks like an OE number
            const folderOe = this.extractOeNumber(item.basename);
            await scanDir(item.filename, folderOe || parentOeHint);
          } else if (item.type === 'file') {
            files.push({
              path: item.filename,
              name: item.basename,
              size: item.size || 0,
              oeHint: parentOeHint,
            });
          }
        }
      } catch (error) {
        this.logger.error(`[ListWebDAV] Error scanning ${dirPath}: ${error.message}`);
      }
    };

    await scanDir(remotePath, rootOeHint || undefined);
    this.logger.log(`[ListWebDAV] Found ${files.length} files`);
    return files;
  }

  private async listFTPFiles(source: ImportSource): Promise<RemoteFile[]> {
    const client = new FtpClient();
    try {
      await client.access({
        host: new URL(source.url).hostname,
        port: parseInt(new URL(source.url).port) || 21,
        user: source.username,
        password: source.password,
        secure: source.url.startsWith('ftps'),
      });

      const files: RemoteFile[] = [];
      const remotePath = source.remotePath || '/';

      // Extract OE number from the last segment of remotePath
      const pathSegments = remotePath.split('/').filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1] || '';
      const rootOeHint = this.extractOeNumber(lastSegment);

      const scanDir = async (dirPath: string, parentOeHint?: string) => {
        if (this.stopFlags.has(source.id)) return;
        const list = await client.list(dirPath);
        for (const item of list) {
          const fullPath = `${dirPath}/${item.name}`.replace(/\/+/g, '/');
          if (item.isDirectory) {
            const folderOe = this.extractOeNumber(item.name);
            await scanDir(fullPath, folderOe || parentOeHint);
          } else if (item.isFile) {
            files.push({ path: fullPath, name: item.name, size: item.size, oeHint: parentOeHint });
          }
        }
      };

      await scanDir(remotePath, rootOeHint || undefined);
      return files;
    } finally {
      client.close();
    }
  }

  private async listLocalFiles(mountPath: string, remotePath: string): Promise<RemoteFile[]> {
    const baseDir = path.join(mountPath, remotePath);
    const files: RemoteFile[] = [];

    // Extract OE number from the last segment of remotePath
    const pathSegments = remotePath.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || '';
    const rootOeHint = this.extractOeNumber(lastSegment);

    const scanDir = async (dir: string, parentOeHint?: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const folderOe = this.extractOeNumber(entry.name);
          await scanDir(fullPath, folderOe || parentOeHint);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          files.push({ path: fullPath, name: entry.name, size: stat.size, oeHint: parentOeHint });
        }
      }
    };

    await scanDir(baseDir, rootOeHint || undefined);
    return files;
  }

  // ---- Download with Retry ----
  private async downloadWithRetry(source: ImportSource, filePath: string, maxRetries: number): Promise<Buffer> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.downloadFile(source, filePath);
      } catch (err) {
        lastError = err;
        this.logger.warn(`[Download] Attempt ${attempt}/${maxRetries} failed for ${filePath}: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    throw lastError;
  }

  private async downloadFile(source: ImportSource, filePath: string): Promise<Buffer> {
    switch (source.protocol) {
      case 'webdav': {
        let webdavUrl = source.url;
        if (!webdavUrl.endsWith('/')) webdavUrl += '/';
        const client = createClient(webdavUrl, {
          username: source.username,
          password: source.password,
          headers: { 'User-Agent': 'CarParts-Asset-Manager/1.0' },
        });
        const stream = client.createReadStream(filePath);
        const chunks: Buffer[] = [];
        return new Promise((resolve, reject) => {
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      }
      case 'ftp': {
        const client = new FtpClient();
        try {
          await client.access({
            host: new URL(source.url).hostname,
            port: parseInt(new URL(source.url).port) || 21,
            user: source.username,
            password: source.password,
            secure: source.url.startsWith('ftps'),
          });
          const tmpPath = `/tmp/ftp_download_${Date.now()}`;
          await client.downloadTo(tmpPath, filePath);
          const buffer = await fs.readFile(tmpPath);
          await fs.unlink(tmpPath).catch(() => {});
          return buffer;
        } finally {
          client.close();
        }
      }
      case 'smb_mount':
        return fs.readFile(filePath);
      default:
        throw new Error(`不支持的协议: ${source.protocol}`);
    }
  }

  // ---- OE Number Detection ----
  extractOeNumber(filename: string): string | null {
    // Strip extension first
    const noExt = filename.replace(/\.[^.]+$/, '');
    const upper = noExt.toUpperCase();

    // Strip trailing image sequence suffix: -1, -2, _1, _2, (1), (2), etc.
    // e.g., "54610-2E100-1" → "54610-2E100", "97674-1J000_3" → "97674-1J000"
    const stripped = upper.replace(/[-_]\d{1,2}$/, '');

    // Try matching on stripped version (preserves hyphens within OE)
    // Hyundai/Kia: 54610-2E100, 97674-1J000, 54610-AB100
    let m = stripped.match(/^(\d{5}-[A-Z0-9]{5})$/);
    if (m) return m[1];

    // Toyota: 90311-47013, 04465-33471
    m = stripped.match(/^(\d{5}-\d{5})$/);
    if (m) return m[1];

    // Mercedes: A0009982504, B0001234567
    m = stripped.match(/^([AB]\d{10})$/);
    if (m) return m[1];

    // VW/Audi: 1K0121253AH, 06A115561E (9-12 chars, letters+digits)
    m = stripped.match(/^([0-9]{1,3}[A-Z][0-9]{5,8}[A-Z]{0,2})$/);
    if (m) return m[1];

    // Also try original (with extension stripped) for formats like "54610-2E100-1"
    // where stripping -1 already happened above

    // Pure digits 6-18: BMW, GM, etc. 31373989, 11427833875
    const cleaned = stripped.replace(/[-_\s]/g, '');
    m = cleaned.match(/^(\d{6,18})$/);
    if (m) return m[1];

    // Alphanumeric 6-20 chars (catch-all for other OE formats)
    m = cleaned.match(/^([A-Z0-9]{6,20})$/);
    if (m) {
      // Reject camera/date filenames
      if (/^IMG\d{8,}$/.test(cleaned)) return null;
      if (/^20\d{6}$/.test(cleaned)) return null;
      if (/^DSC[_-]?\d+$/i.test(cleaned)) return null;
      if (/^IMG[_-]?\d+$/i.test(cleaned)) return null;
      if (/^VID[_-]?\d+$/i.test(cleaned)) return null;
      if (/^SCREENSHOT/i.test(cleaned)) return null;
      return m[1];
    }

    return null;
  }

  // ---- Auto Classification ----
  private classifyByFolder(filePath: string, folderMapping: Record<string, number>): number | null {
    if (!folderMapping || Object.keys(folderMapping).length === 0) return null;

    const parts = filePath.split('/').filter(Boolean);
    for (let i = parts.length - 2; i >= 0; i--) {
      const folderName = parts[i];
      if (folderMapping[folderName]) return folderMapping[folderName];
      for (const [key, classId] of Object.entries(folderMapping)) {
        if (folderName.includes(key) || key.includes(folderName)) return classId;
      }
    }
    return null;
  }

  // ---- Background Processing ----
  private async processInBackground(assetId: number, filePath: string, folderMapping?: Record<string, number>) {
    const absPath = this.imageProcessing.getAbsolutePath(filePath);
    try {
      await this.assetRepo.update(assetId, { ocrStatus: 'processing' });
      const ocr = await this.ocrService.recognizeText(absPath);
      await this.assetRepo.update(assetId, { ocrText: ocr.text, ocrStatus: ocr.status });

      await this.assetRepo.update(assetId, { recognitionStatus: 'processing' });
      const recognition = await this.recognitionService.recognize(absPath);
      const aiOeNumber = recognition.result.oe_numbers?.[0] || '';
      const updateData: any = {
        recognizedPartType: recognition.result.part_type || '',
        recognizedBrand: recognition.result.brand || '',
        recognitionConfidence: recognition.result.confidence,
        recognitionResult: recognition.result,
        recognitionStatus: recognition.status,
      };

      // Only update OE number if AI found one (don't overwrite folder-based OE)
      if (aiOeNumber) {
        updateData.recognizedOeNumber = aiOeNumber;
      }

      if (!updateData.classificationId && recognition.result.part_type) {
        const classId = await this.matchClassificationByAI(recognition.result.part_type, folderMapping);
        if (classId) updateData.classificationId = classId;
      }

      await this.assetRepo.update(assetId, updateData);

      // Match part by AI-detected OE or existing folder-based OE
      const oeToMatch = aiOeNumber || (await this.assetRepo.findOne({ where: { id: assetId } }))?.recognizedOeNumber;
      if (oeToMatch) {
        const part = await this.partRepo.findOne({ where: { oeNumber: oeToMatch } });
        if (part) {
          await this.assetRepo.update(assetId, {
            partId: part.id,
            partNameCn: part.partNameCn || '',
            partNameEn: part.partNameEn || '',
          });
        }
      }
    } catch (error) {
      this.logger.error(`Background processing failed for asset ${assetId}: ${error.message}`);
      await this.assetRepo.update(assetId, { ocrStatus: 'error', recognitionStatus: 'error' });
    }
  }

  private async matchClassificationByAI(partType: string, folderMapping?: Record<string, number>): Promise<number | null> {
    if (folderMapping) {
      for (const [key, classId] of Object.entries(folderMapping)) {
        if (partType.includes(key) || key.includes(partType)) return classId;
      }
    }
    const classifications = await this.classRepo.find();
    for (const cls of classifications) {
      if (partType.includes(cls.name) || cls.name.includes(partType)) return cls.id;
    }
    return null;
  }

  // ---- Lookup part name by OE number using AI ----
  async lookupPartNameByOE(oeNumber: string): Promise<{ partNameCn: string; partNameEn: string; brand: string; partType: string } | null> {
    if (this.oeLookupCache.has(oeNumber)) {
      return this.oeLookupCache.get(oeNumber)!;
    }

    const settings = await this.settingsSvc.getAll();
    if (settings.oe_lookup_enabled === 'false') return null;

    const apiKey = settings.oe_lookup_api_key || process.env.ZHIPU_API_KEY;
    if (!apiKey) return null;

    const apiType = settings.oe_lookup_api_type || 'zhipu';
    const preset = OE_PROVIDER_PRESETS[apiType] || OE_PROVIDER_PRESETS.zhipu;
    const apiUrl = settings.oe_lookup_api_url || preset.url;
    const model = settings.oe_lookup_model || preset.model;

    try {
      const prompt = `你是汽车配件OE号码查询专家。请根据OE号码 "${oeNumber}" 查询对应的配件信息。返回严格JSON：{"partNameCn":"中文名","partNameEn":"英文名","brand":"品牌","partType":"类型"}。只返回JSON。`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 512, temperature: 0.1 }),
      });

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const lookupResult = {
        partNameCn: result.partNameCn || '',
        partNameEn: result.partNameEn || '',
        brand: result.brand || '',
        partType: result.partType || '',
      };

      this.oeLookupCache.set(oeNumber, lookupResult);
      this.logger.log(`[OE Lookup] ${oeNumber} → ${JSON.stringify(lookupResult)}`);
      return lookupResult;
    } catch (error) {
      this.logger.error(`OE lookup failed for ${oeNumber}: ${error.message}`);
      return null;
    }
  }
}

const OE_PROVIDER_PRESETS: Record<string, { url: string; model: string }> = {
  zhipu:      { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  deepseek:   { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  qwen:       { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  doubao:     { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
  hunyuan:    { url: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-standard' },
  kimi:       { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
  mimo:       { url: 'https://api.xiaomi.com/v1/chat/completions', model: 'mimo' },
  bailian:    { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  volcengine: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
  openai:     { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  custom:     { url: '', model: '' },
};
