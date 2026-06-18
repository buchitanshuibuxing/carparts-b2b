"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ImportSourcesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportSourcesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const webdav_1 = require("webdav");
const basic_ftp_1 = require("basic-ftp");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const import_source_entity_1 = require("./entities/import-source.entity");
const image_asset_entity_1 = require("./entities/image-asset.entity");
const asset_classification_entity_1 = require("./entities/asset-classification.entity");
const image_processing_service_1 = require("./image-processing.service");
const ocr_service_1 = require("./ocr.service");
const image_recognition_service_1 = require("./image-recognition.service");
const settings_service_1 = require("../settings/settings.service");
const part_entity_1 = require("../parts/entities/part.entity");
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv']);
const ALL_MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);
let ImportSourcesService = ImportSourcesService_1 = class ImportSourcesService {
    sourceRepo;
    assetRepo;
    classRepo;
    partRepo;
    imageProcessing;
    ocrService;
    recognitionService;
    settingsSvc;
    logger = new common_1.Logger(ImportSourcesService_1.name);
    isScanning = false;
    stopFlags = new Map();
    oeLookupCache = new Map();
    constructor(sourceRepo, assetRepo, classRepo, partRepo, imageProcessing, ocrService, recognitionService, settingsSvc) {
        this.sourceRepo = sourceRepo;
        this.assetRepo = assetRepo;
        this.classRepo = classRepo;
        this.partRepo = partRepo;
        this.imageProcessing = imageProcessing;
        this.ocrService = ocrService;
        this.recognitionService = recognitionService;
        this.settingsSvc = settingsSvc;
    }
    async findAll() {
        return this.sourceRepo.find({ order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const source = await this.sourceRepo.findOne({ where: { id } });
        if (!source)
            throw new common_1.NotFoundException('导入源不存在');
        return source;
    }
    async create(data) {
        const source = this.sourceRepo.create(data);
        return this.sourceRepo.save(source);
    }
    async update(id, data) {
        const source = await this.findOne(id);
        Object.assign(source, data);
        return this.sourceRepo.save(source);
    }
    async remove(id) {
        const source = await this.findOne(id);
        await this.sourceRepo.remove(source);
    }
    async handleScheduledScans() {
        if (this.isScanning)
            return;
        try {
            this.isScanning = true;
            const now = new Date();
            const sources = await this.sourceRepo.find({
                where: { scanInterval: (0, typeorm_2.MoreThan)(0), status: 'idle' },
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
                }
                catch (error) {
                    this.logger.error(`Auto-scan failed for source ${source.name}: ${error.message}`);
                }
            }
        }
        finally {
            this.isScanning = false;
        }
    }
    async testConnection(id) {
        const source = await this.findOne(id);
        try {
            const timeout = 15000;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('连接超时')), timeout);
            });
            const testPromise = this.listRemoteFiles(source);
            const files = await Promise.race([testPromise, timeoutPromise]);
            const mediaFiles = files.filter(f => ALL_MEDIA_EXTENSIONS.has(path_1.default.extname(f.name).toLowerCase()));
            const sample = files.slice(0, 5).map(f => f.name);
            this.logger.log(`[TestConn] url=${source.url}, remotePath=${source.remotePath}, totalFiles=${files.length}, media=${mediaFiles.length}`);
            return { success: true, message: `连接成功，共 ${files.length} 个文件，${mediaFiles.length} 个媒体文件`, fileCount: mediaFiles.length, totalFiles: files.length, sampleFiles: sample };
        }
        catch (error) {
            this.logger.error(`Test connection failed for source ${id}:`, error);
            let message = '连接失败';
            if (error.message?.includes('超时'))
                message = '连接超时，请检查网络和URL';
            else if (error.message?.includes('401') || error.message?.includes('403'))
                message = '认证失败，请检查用户名和密码';
            else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED'))
                message = '无法连接到服务器，请检查 URL';
            else
                message = `连接失败: ${error.message}`;
            return { success: false, message };
        }
    }
    async browseDirectory(sourceId, dirPath) {
        const source = await this.findOne(sourceId);
        const items = [];
        try {
            switch (source.protocol) {
                case 'webdav': {
                    let webdavUrl = source.url;
                    if (!webdavUrl.endsWith('/'))
                        webdavUrl += '/';
                    const client = (0, webdav_1.createClient)(webdavUrl, {
                        username: source.username,
                        password: source.password,
                        headers: { 'User-Agent': 'CarParts-Asset-Manager/1.0' },
                    });
                    const contents = await client.getDirectoryContents(dirPath);
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
                    const ftpClient = new basic_ftp_1.Client();
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
                    }
                    finally {
                        ftpClient.close();
                    }
                    break;
                }
                case 'smb_mount': {
                    const baseDir = path_1.default.join(source.localMountPath, dirPath);
                    const entries = await promises_1.default.readdir(baseDir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path_1.default.join(dirPath, entry.name);
                        items.push({
                            path: fullPath,
                            name: entry.name,
                            isDirectory: entry.isDirectory(),
                            size: entry.isFile() ? (await promises_1.default.stat(path_1.default.join(baseDir, entry.name))).size : undefined,
                        });
                    }
                    break;
                }
                default:
                    throw new Error(`不支持的协议: ${source.protocol}`);
            }
            items.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory)
                    return -1;
                if (!a.isDirectory && b.isDirectory)
                    return 1;
                return a.name.localeCompare(b.name);
            });
            return items;
        }
        catch (error) {
            this.logger.error(`Browse directory failed:`, error);
            throw new Error(`无法浏览目录: ${error.message}`);
        }
    }
    async startImport(sourceId) {
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
    async stopImport(sourceId) {
        const source = await this.findOne(sourceId);
        if (source.status !== 'importing' && source.status !== 'scanning') {
            throw new Error('当前没有正在进行的导入');
        }
        this.stopFlags.set(sourceId, true);
        this.logger.log(`[Import] Stop requested for source ${sourceId}`);
        return { message: '正在停止导入...' };
    }
    async getImportProgress(sourceId) {
        const source = await this.findOne(sourceId);
        return {
            status: source.status,
            progress: source.importProgress,
            errorMessage: source.errorMessage,
            lastSyncAt: source.lastSyncAt,
        };
    }
    async runImport(sourceId) {
        const source = await this.findOne(sourceId);
        await this.sourceRepo.update(sourceId, {
            status: 'scanning',
            errorMessage: '',
            importProgress: { imported: 0, skipped: 0, errors: 0, total: 0, currentFile: '正在扫描目录...' },
        });
        try {
            const remoteFiles = await this.listRemoteFiles(source);
            const mediaFiles = remoteFiles.filter(f => ALL_MEDIA_EXTENSIONS.has(path_1.default.extname(f.name).toLowerCase()));
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
            await this.sourceRepo.update(sourceId, {
                status: 'importing',
                importProgress: { imported: 0, skipped: 0, errors: 0, total: mediaFiles.length, currentFile: '' },
            });
            let imported = 0;
            let skipped = 0;
            let errors = 0;
            for (let i = 0; i < mediaFiles.length; i++) {
                if (this.stopFlags.has(sourceId)) {
                    this.stopFlags.delete(sourceId);
                    this.logger.log(`[Import] Stopped by user for source ${sourceId}`);
                    await this.sourceRepo.update(sourceId, {
                        status: 'idle',
                        lastSyncAt: new Date(),
                        importProgress: { imported, skipped, errors, total: mediaFiles.length, currentFile: '' },
                        errorMessage: `用户停止，已导入 ${imported} 个`,
                    });
                    return;
                }
                const file = mediaFiles[i];
                const isVideo = VIDEO_EXTENSIONS.has(path_1.default.extname(file.name).toLowerCase());
                try {
                    await this.sourceRepo.update(sourceId, {
                        importProgress: { imported, skipped, errors, total: mediaFiles.length, currentFile: file.name },
                    });
                    const existing = await this.assetRepo.findOne({ where: { fileName: file.name } });
                    if (existing) {
                        skipped++;
                        continue;
                    }
                    const buffer = await this.downloadWithRetry(source, file.path, 3);
                    const nameWithoutExt = path_1.default.basename(file.name, path_1.default.extname(file.name));
                    let oeNumber = file.oeHint || this.extractOeNumber(nameWithoutExt);
                    let partId;
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
                                if (cls)
                                    classificationId = cls.id;
                            }
                            this.logger.log(`[Import] OE match: ${file.name} → ${part.oeNumber} (${partNameCn})`);
                        }
                        else {
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
                    let saved;
                    let thumbnails;
                    if (isVideo) {
                        const ext = path_1.default.extname(file.name).toLowerCase();
                        const mimeMap = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska', '.flv': 'video/x-flv', '.wmv': 'video/x-ms-wmv' };
                        saved = await this.imageProcessing.saveVideo(buffer, file.name, mimeMap[ext] || 'video/mp4');
                        const videoUuid = path_1.default.basename(saved.filePath, path_1.default.extname(saved.filePath));
                        thumbnails = await this.imageProcessing.extractVideoThumbnail(this.imageProcessing.getAbsolutePath(saved.filePath), videoUuid);
                    }
                    else {
                        saved = await this.imageProcessing.saveOriginal(buffer, file.name);
                        const imgUuid = path_1.default.basename(saved.filePath, path_1.default.extname(saved.filePath));
                        thumbnails = await this.imageProcessing.generateThumbnails(buffer, imgUuid);
                    }
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
                    if (!partId && !isVideo) {
                        this.processInBackground(asset.id, saved.filePath, source.folderMapping);
                    }
                    imported++;
                    if (imported % 50 === 0) {
                        this.logger.log(`[Import] Progress: ${imported}/${mediaFiles.length} imported, ${errors} errors`);
                    }
                }
                catch (err) {
                    errors++;
                    this.logger.error(`[Import] Failed: ${file.name}: ${err.message}`);
                }
            }
            await this.sourceRepo.update(sourceId, {
                status: 'idle',
                lastSyncAt: new Date(),
                importProgress: { imported, skipped, errors, total: mediaFiles.length, currentFile: '' },
                errorMessage: '',
            });
            this.logger.log(`[Import] Complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);
        }
        catch (error) {
            await this.sourceRepo.update(sourceId, {
                status: 'error',
                importProgress: null,
                errorMessage: error.message,
            });
            this.logger.error(`[Import] Fatal error: ${error.message}`);
        }
    }
    async listRemoteFiles(source) {
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
    async listWebDAVFiles(source) {
        let webdavUrl = source.url;
        if (!webdavUrl.endsWith('/'))
            webdavUrl += '/';
        const client = (0, webdav_1.createClient)(webdavUrl, {
            username: source.username,
            password: source.password,
            headers: { 'User-Agent': 'CarParts-Asset-Manager/1.0' },
        });
        const files = [];
        const remotePath = source.remotePath || '/';
        const pathSegments = remotePath.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || '';
        const rootOeHint = this.extractOeNumber(lastSegment);
        this.logger.log(`[ListWebDAV] remotePath=${remotePath}, lastSegment=${lastSegment}, rootOeHint=${rootOeHint}`);
        const scanDir = async (dirPath, parentOeHint) => {
            if (this.stopFlags.has(source.id))
                return;
            try {
                const contents = await client.getDirectoryContents(dirPath);
                for (const item of contents) {
                    if (item.type === 'directory') {
                        const folderOe = this.extractOeNumber(item.basename);
                        await scanDir(item.filename, folderOe || parentOeHint);
                    }
                    else if (item.type === 'file') {
                        files.push({
                            path: item.filename,
                            name: item.basename,
                            size: item.size || 0,
                            oeHint: parentOeHint,
                        });
                    }
                }
            }
            catch (error) {
                this.logger.error(`[ListWebDAV] Error scanning ${dirPath}: ${error.message}`);
            }
        };
        await scanDir(remotePath, rootOeHint || undefined);
        this.logger.log(`[ListWebDAV] Found ${files.length} files`);
        return files;
    }
    async listFTPFiles(source) {
        const client = new basic_ftp_1.Client();
        try {
            await client.access({
                host: new URL(source.url).hostname,
                port: parseInt(new URL(source.url).port) || 21,
                user: source.username,
                password: source.password,
                secure: source.url.startsWith('ftps'),
            });
            const files = [];
            const remotePath = source.remotePath || '/';
            const pathSegments = remotePath.split('/').filter(Boolean);
            const lastSegment = pathSegments[pathSegments.length - 1] || '';
            const rootOeHint = this.extractOeNumber(lastSegment);
            const scanDir = async (dirPath, parentOeHint) => {
                if (this.stopFlags.has(source.id))
                    return;
                const list = await client.list(dirPath);
                for (const item of list) {
                    const fullPath = `${dirPath}/${item.name}`.replace(/\/+/g, '/');
                    if (item.isDirectory) {
                        const folderOe = this.extractOeNumber(item.name);
                        await scanDir(fullPath, folderOe || parentOeHint);
                    }
                    else if (item.isFile) {
                        files.push({ path: fullPath, name: item.name, size: item.size, oeHint: parentOeHint });
                    }
                }
            };
            await scanDir(remotePath, rootOeHint || undefined);
            return files;
        }
        finally {
            client.close();
        }
    }
    async listLocalFiles(mountPath, remotePath) {
        const baseDir = path_1.default.join(mountPath, remotePath);
        const files = [];
        const pathSegments = remotePath.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || '';
        const rootOeHint = this.extractOeNumber(lastSegment);
        const scanDir = async (dir, parentOeHint) => {
            const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const folderOe = this.extractOeNumber(entry.name);
                    await scanDir(fullPath, folderOe || parentOeHint);
                }
                else if (entry.isFile()) {
                    const stat = await promises_1.default.stat(fullPath);
                    files.push({ path: fullPath, name: entry.name, size: stat.size, oeHint: parentOeHint });
                }
            }
        };
        await scanDir(baseDir, rootOeHint || undefined);
        return files;
    }
    async downloadWithRetry(source, filePath, maxRetries) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.downloadFile(source, filePath);
            }
            catch (err) {
                lastError = err;
                this.logger.warn(`[Download] Attempt ${attempt}/${maxRetries} failed for ${filePath}: ${err.message}`);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                }
            }
        }
        throw lastError;
    }
    async downloadFile(source, filePath) {
        switch (source.protocol) {
            case 'webdav': {
                let webdavUrl = source.url;
                if (!webdavUrl.endsWith('/'))
                    webdavUrl += '/';
                const client = (0, webdav_1.createClient)(webdavUrl, {
                    username: source.username,
                    password: source.password,
                    headers: { 'User-Agent': 'CarParts-Asset-Manager/1.0' },
                });
                const stream = client.createReadStream(filePath);
                const chunks = [];
                return new Promise((resolve, reject) => {
                    stream.on('data', (chunk) => chunks.push(chunk));
                    stream.on('end', () => resolve(Buffer.concat(chunks)));
                    stream.on('error', reject);
                });
            }
            case 'ftp': {
                const client = new basic_ftp_1.Client();
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
                    const buffer = await promises_1.default.readFile(tmpPath);
                    await promises_1.default.unlink(tmpPath).catch(() => { });
                    return buffer;
                }
                finally {
                    client.close();
                }
            }
            case 'smb_mount':
                return promises_1.default.readFile(filePath);
            default:
                throw new Error(`不支持的协议: ${source.protocol}`);
        }
    }
    extractOeNumber(filename) {
        const noExt = filename.replace(/\.[^.]+$/, '');
        const upper = noExt.toUpperCase();
        const stripped = upper.replace(/[-_]\d{1,2}$/, '');
        let m = stripped.match(/^(\d{5}-[A-Z0-9]{5})$/);
        if (m)
            return m[1];
        m = stripped.match(/^(\d{5}-\d{5})$/);
        if (m)
            return m[1];
        m = stripped.match(/^([AB]\d{10})$/);
        if (m)
            return m[1];
        m = stripped.match(/^([0-9]{1,3}[A-Z][0-9]{5,8}[A-Z]{0,2})$/);
        if (m)
            return m[1];
        const cleaned = stripped.replace(/[-_\s]/g, '');
        m = cleaned.match(/^(\d{6,18})$/);
        if (m)
            return m[1];
        m = cleaned.match(/^([A-Z0-9]{6,20})$/);
        if (m) {
            if (/^IMG\d{8,}$/.test(cleaned))
                return null;
            if (/^20\d{6}$/.test(cleaned))
                return null;
            if (/^DSC[_-]?\d+$/i.test(cleaned))
                return null;
            if (/^IMG[_-]?\d+$/i.test(cleaned))
                return null;
            if (/^VID[_-]?\d+$/i.test(cleaned))
                return null;
            if (/^SCREENSHOT/i.test(cleaned))
                return null;
            return m[1];
        }
        return null;
    }
    classifyByFolder(filePath, folderMapping) {
        if (!folderMapping || Object.keys(folderMapping).length === 0)
            return null;
        const parts = filePath.split('/').filter(Boolean);
        for (let i = parts.length - 2; i >= 0; i--) {
            const folderName = parts[i];
            if (folderMapping[folderName])
                return folderMapping[folderName];
            for (const [key, classId] of Object.entries(folderMapping)) {
                if (folderName.includes(key) || key.includes(folderName))
                    return classId;
            }
        }
        return null;
    }
    async processInBackground(assetId, filePath, folderMapping) {
        const absPath = this.imageProcessing.getAbsolutePath(filePath);
        try {
            await this.assetRepo.update(assetId, { ocrStatus: 'processing' });
            const ocr = await this.ocrService.recognizeText(absPath);
            await this.assetRepo.update(assetId, { ocrText: ocr.text, ocrStatus: ocr.status });
            await this.assetRepo.update(assetId, { recognitionStatus: 'processing' });
            const recognition = await this.recognitionService.recognize(absPath);
            const aiOeNumber = recognition.result.oe_numbers?.[0] || '';
            const updateData = {
                recognizedPartType: recognition.result.part_type || '',
                recognizedBrand: recognition.result.brand || '',
                recognitionConfidence: recognition.result.confidence,
                recognitionResult: recognition.result,
                recognitionStatus: recognition.status,
            };
            if (aiOeNumber) {
                updateData.recognizedOeNumber = aiOeNumber;
            }
            if (!updateData.classificationId && recognition.result.part_type) {
                const classId = await this.matchClassificationByAI(recognition.result.part_type, folderMapping);
                if (classId)
                    updateData.classificationId = classId;
            }
            await this.assetRepo.update(assetId, updateData);
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
        }
        catch (error) {
            this.logger.error(`Background processing failed for asset ${assetId}: ${error.message}`);
            await this.assetRepo.update(assetId, { ocrStatus: 'error', recognitionStatus: 'error' });
        }
    }
    async matchClassificationByAI(partType, folderMapping) {
        if (folderMapping) {
            for (const [key, classId] of Object.entries(folderMapping)) {
                if (partType.includes(key) || key.includes(partType))
                    return classId;
            }
        }
        const classifications = await this.classRepo.find();
        for (const cls of classifications) {
            if (partType.includes(cls.name) || cls.name.includes(partType))
                return cls.id;
        }
        return null;
    }
    async lookupPartNameByOE(oeNumber) {
        if (this.oeLookupCache.has(oeNumber)) {
            return this.oeLookupCache.get(oeNumber);
        }
        const settings = await this.settingsSvc.getAll();
        if (settings.oe_lookup_enabled === 'false')
            return null;
        const apiKey = settings.oe_lookup_api_key || process.env.ZHIPU_API_KEY;
        if (!apiKey)
            return null;
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
        }
        catch (error) {
            this.logger.error(`OE lookup failed for ${oeNumber}: ${error.message}`);
            return null;
        }
    }
};
exports.ImportSourcesService = ImportSourcesService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ImportSourcesService.prototype, "handleScheduledScans", null);
exports.ImportSourcesService = ImportSourcesService = ImportSourcesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(import_source_entity_1.ImportSource)),
    __param(1, (0, typeorm_1.InjectRepository)(image_asset_entity_1.ImageAsset)),
    __param(2, (0, typeorm_1.InjectRepository)(asset_classification_entity_1.AssetClassification)),
    __param(3, (0, typeorm_1.InjectRepository)(part_entity_1.Part)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        image_processing_service_1.ImageProcessingService,
        ocr_service_1.OcrService,
        image_recognition_service_1.ImageRecognitionService,
        settings_service_1.SettingsService])
], ImportSourcesService);
const OE_PROVIDER_PRESETS = {
    zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
    deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
    doubao: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
    hunyuan: { url: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-standard' },
    kimi: { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
    mimo: { url: 'https://api.xiaomi.com/v1/chat/completions', model: 'mimo' },
    bailian: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
    volcengine: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
    openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    custom: { url: '', model: '' },
};
//# sourceMappingURL=import-sources.service.js.map