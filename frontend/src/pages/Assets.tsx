import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import JSZip from 'jszip';
import { Upload, Search, X, Trash2, Loader2, CheckCircle, AlertCircle, Clock, Globe, Plus, Play, Wifi, RefreshCw, Folder, FolderOpen, File, ChevronRight, ChevronDown, Home, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { LazyImage } from '@/components/ui/LazyImage';
import api from '@/lib/api';
import type { ImageAsset, AssetClassification } from '@/types/image-asset';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useImportProgress } from '@/hooks/useImportProgress';
// Standalone input component to avoid cursor issues
function OeHintInput({ value, onChange, folderHint }: { value: string; onChange: (v: string) => void; folderHint: string }) {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  const handleBlur = () => { onChange(localValue); };
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">指定OE号（可选）</label>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        placeholder="如 27410-23700，留空则自动从文件名/文件夹名提取"
      />
      <p className="text-xs text-gray-400">
        {folderHint ? `文件夹OE: ${folderHint}，填写此项将覆盖` : '填写后所有上传的图片将关联此OE号'}
      </p>
    </div>
  );
}

// Standalone classification manager component to avoid cursor issues
function ClassificationManager({ classifications, onClose, onRefresh }: {
  classifications: AssetClassification[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [newClassName, setNewClassName] = useState('');

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    try {
      await api.post('/assets/meta/classifications', { name: newClassName });
      setNewClassName('');
      onRefresh();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    }
  };

  const handleDeleteClass = async (id: number) => {
    const confirmed = await confirm({ message: '确定删除此分类？', variant: 'danger' });
      if (!confirmed) return;
    try {
      await api.delete(`/assets/meta/classifications/${id}`);
      onRefresh();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="分类管理" size="md">
      <div className="space-y-4">
        <div className="space-y-1 mb-2">
          {classifications.map(c => (
            <div key={c.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
              <span className="text-sm">{c.name}</span>
              <button className="text-red-500 text-xs hover:underline" onClick={() => handleDeleteClass(c.id)}>删除</button>
            </div>
          ))}
          {classifications.length === 0 && <p className="text-sm text-gray-400 py-2">暂无分类</p>}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="新分类名称"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
          />
          <Button size="sm" onClick={handleCreateClass}>添加</Button>
        </div>
      </div>
    </Modal>
  );
}

interface ImportSource {
  id: number;
  name: string;
  protocol: string;
  url: string;
  username: string;
  password: string;
  localMountPath: string;
  remotePath: string;
  autoClassify: boolean;
  folderMapping: Record<string, number>;
  scanInterval: number;
  lastScanAt: string | null;
  lastSyncAt: string | null;
  status: string;
  errorMessage: string;
  importProgress: {
    imported: number;
    skipped: number;
    errors: number;
    total: number;
    currentFile: string;
    currentFileSize?: number;
    currentFileIndex?: number;
    lastActivityAt?: string;
    estimatedTimeLeft?: string;
    downloadSpeed?: number;
    downloadSpeedText?: string;
    fileLog?: { name: string; oe: string; status: string; error: string }[];
  } | null;
}

interface DirItem {
  path: string;
  name: string;
  isDirectory: boolean;
  size?: number;
}

export default function Assets() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [assets, setAssets] = useState<{ items: ImageAsset[]; total: number; page: number; page_size: number }>({ items: [], total: 0, page: 1, page_size: 30 });
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [classificationId, setClassificationId] = useState<string>('');
  const [oeFilter, setOeFilter] = useState('');
  const [classifications, setClassifications] = useState<AssetClassification[]>([]);
  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showClassManager, setShowClassManager] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadFolderHint, setUploadFolderHint] = useState<string>('');
  const [manualOeHint, setManualOeHint] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{
    phase: string; current: number; total: number; success: number; failed: number;
    errors: string[]; done: boolean; speed: string; currentFile: string;
    bytesUploaded: number; bytesTotal: number; startTime: number;
    fileLog: { name: string; oe: string; status: 'ok' | 'fail' | 'pending'; error?: string }[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileLogRef = useRef<HTMLDivElement>(null);

  // Import sources state
  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [editSource, setEditSource] = useState<ImportSource | null>(null);
  const [sourceForm, setSourceForm] = useState({
    name: '', protocol: 'webdav', ssl: false, host: '', port: '', path: '', username: '', password: '',
    local_mount_path: '', remote_path: '/', auto_classify: true,
    folder_mapping: {} as Record<string, number>,
    scan_interval: 0,
  });
  const [importing, setImporting] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);

  // WebSocket for real-time import progress
  const { progress: wsProgress, connected: wsConnected } = useImportProgress({
    sourceId: importing,
    enabled: importing !== null,
    onProgress: (data) => {
      setImportProgress({
        status: data.status,
        progress: {
          imported: data.imported,
          skipped: data.skipped,
          errors: data.errors,
          total: data.total,
          currentFile: data.currentFile,
          fileLog: [],
        },
        errorMessage: '',
      });
    },
    onComplete: (data) => {
      setImportProgress({
        status: 'complete',
        progress: {
          imported: data.imported,
          skipped: data.skipped,
          errors: data.errors,
          total: data.imported + data.skipped + data.errors,
          currentFile: '',
          fileLog: [],
        },
        errorMessage: '',
      });
      setImporting(null);
      fetchAssets();
      fetchSources();
    },
    onError: (error) => {
      setImportProgress({
        status: 'error',
        progress: null,
        errorMessage: error,
      });
    },
  });
  const [newMapFolder, setNewMapFolder] = useState('');
  const [newMapClassId, setNewMapClassId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [importProgress, setImportProgress] = useState<{ status: string; progress: { imported: number; skipped: number; errors: number; total: number; currentFile: string; fileLog?: { name: string; oe: string; status: string; error: string }[] } | null; errorMessage: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchClassify, setShowBatchClassify] = useState(false);
  const [batchClassId, setBatchClassId] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [editFields, setEditFields] = useState({ recognizedOeNumber: '', recognizedPartType: '', recognizedBrand: '', partNameCn: '', partNameEn: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchEditFields, setBatchEditFields] = useState({ recognizedOeNumber: '', recognizedPartType: '', recognizedBrand: '', partNameCn: '', partNameEn: '' });
  const [batchProgress, setBatchProgress] = useState<{ active: boolean; title: string; total: number; current: number; success: number; failed: number; done: boolean }>({ active: false, title: '', total: 0, current: 0, success: 0, failed: 0, done: false });

  // Uncontrolled input refs for preview modal — avoids re-render-on-every-keystroke
  const oeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);
  const cnRef = useRef<HTMLInputElement>(null);
  const enRef = useRef<HTMLInputElement>(null);

  // Directory browser state
  const [showBrowser, setShowBrowser] = useState(false);
  const [browsingSourceId, setBrowsingSourceId] = useState<number | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [dirItems, setDirItems] = useState<DirItem[]>([]);
  const [loadingDir, setLoadingDir] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');

  const fetchAssets = async () => {
    const params: any = { page, page_size: 30 };
    if (keyword) params.keyword = keyword;
    if (classificationId) params.classification_id = classificationId;
    if (oeFilter) params.oe_number = oeFilter;
    const { data: res } = await api.get('/assets', { params });
    setAssets(res.data || res);
  };

  const fetchMeta = async () => {
    try {
      const classRes = await api.get('/assets/meta/classifications');
      setClassifications(classRes.data.data || classRes.data || []);
    } catch { /* ignore */ }
  };

  const fetchSources = async () => {
    try {
      const { data: res } = await api.get('/assets/sources');
      setSources(res.data || res || []);
    } catch { setSources([]); }
  };

  // Directory browser functions
  const openBrowser = async (sourceId: number) => {
    setBrowsingSourceId(sourceId);
    setCurrentPath('/');
    setSelectedPath('');
    setShowBrowser(true);
    await browseDirectory(sourceId, '/');
  };

  const browseDirectory = async (sourceId: number, dirPath: string) => {
    setLoadingDir(true);
    try {
      const { data: res } = await api.get(`/assets/sources/${sourceId}/browse`, { params: { path: dirPath } });
      const items = res.data || res || [];
      setDirItems(Array.isArray(items) ? items : []);
      setCurrentPath(dirPath);
    } catch (err: any) {
      console.error('Browse failed:', err);
      const msg = err.response?.data?.message || err.message || '浏览失败';
      success(`浏览目录失败: ${msg}`);
      setDirItems([]);
    } finally {
      setLoadingDir(false);
    }
  };

  const navigateToFolder = (folderPath: string) => {
    if (browsingSourceId) {
      browseDirectory(browsingSourceId, folderPath);
    }
  };

  const selectCurrentPath = async () => {
    setSourceForm(prev => ({ ...prev, remote_path: currentPath }));
    setShowBrowser(false);
    // Save the path to database immediately
    if (browsingSourceId) {
      try {
        await api.put(`/assets/sources/${browsingSourceId}`, { remote_path: currentPath });
        fetchSources();
      } catch (err) {
        console.error('Failed to save path:', err);
      }
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => { fetchAssets(); }, [page, keyword, classificationId, oeFilter]);
  useEffect(() => { fetchMeta(); }, []);
  // Auto-scroll file log to bottom when upload progress updates
  useEffect(() => {
    if (uploadProgress?.fileLog && fileLogRef.current) {
      fileLogRef.current.scrollTop = fileLogRef.current.scrollHeight;
    }
  }, [uploadProgress?.current]);
  useEffect(() => {
    if (previewAsset) {
      setEditFields({
        recognizedOeNumber: previewAsset.recognizedOeNumber || '',
        recognizedPartType: previewAsset.recognizedPartType || '',
        recognizedBrand: previewAsset.recognizedBrand || '',
        partNameCn: previewAsset.partNameCn || '',
        partNameEn: previewAsset.partNameEn || '',
      });
      // Sync uncontrolled refs
      requestAnimationFrame(() => {
        if (oeRef.current) oeRef.current.value = previewAsset.recognizedOeNumber || '';
        if (typeRef.current) typeRef.current.value = previewAsset.recognizedPartType || '';
        if (brandRef.current) brandRef.current.value = previewAsset.recognizedBrand || '';
        if (cnRef.current) cnRef.current.value = previewAsset.partNameCn || '';
        if (enRef.current) enRef.current.value = previewAsset.partNameEn || '';
      });
    }
  }, [previewAsset]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    setUploadFiles(prev => [...prev, ...files]);
    setShowUpload(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setUploadFolderHint('');
      setShowUpload(true);
    }
  };

  const openFolderPicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.multiple = true;
    input.onchange = (e: any) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const fileArr = Array.from(files) as File[];
        setUploadFiles(fileArr);
        // Try to extract OE from the first file's parent folder
        const relPath = (fileArr[0] as any).webkitRelativePath || '';
        const parts = relPath.split('/');
        // Parent folder is the second-to-last part (e.g., "27410-23700/img1.jpg" -> "27410-23700")
        const parentFolder = parts.length >= 2 ? parts[parts.length - 2] : parts[0] || '';
        const oeMatch = parentFolder.match(/([A-Z0-9]{2,6}-[A-Z0-9]{3,8})/i);
        setUploadFolderHint(oeMatch ? oeMatch[1].toUpperCase() : '');
        setShowUpload(true);
      }
    };
    input.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  };

  const handleUpload = async () => {
    if (!uploadFiles.length) return;
    const BATCH_SIZE = 20;
    const MAX_RETRIES = 3;
    const total = uploadFiles.length;
    const errors: string[] = [];
    let success = 0;
    let failed = 0;
    const startTime = Date.now();
    const bytesTotal = uploadFiles.reduce((s, f) => s + f.size, 0);
    let bytesUploaded = 0;

    // Build initial file log
    const fileLog: { name: string; oe: string; status: 'ok' | 'fail' | 'pending'; error?: string }[] = uploadFiles.map(f => {
      const rel = (f as any).webkitRelativePath || f.name;
      const parts = rel.split('/');
      const parent = parts.length >= 2 ? parts[parts.length - 2] : '';
      const oeMatch = parent.match(/([A-Z0-9]{2,6}-[A-Z0-9]{4,8})/i);
      return { name: f.name, oe: oeMatch ? oeMatch[1].toUpperCase() : '-', status: 'pending' as const };
    });

    const updateProgress = (phase: string, current: number, currentFile: string) => {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? formatBytes(bytesUploaded / elapsed) + '/s' : '-';
      setUploadProgress({ phase, current, total, success, failed, errors, done: false, speed, currentFile, bytesUploaded, bytesTotal, startTime, fileLog });
    };

    updateProgress('准备上传', 0, '');

    const buildBatchFd = (files: File[]) => {
      const fd = new FormData();
      const paths: string[] = [];
      files.forEach(f => {
        fd.append('files', f);
        paths.push((f as any).webkitRelativePath || f.name);
      });
      fd.append('file_paths', JSON.stringify(paths));
      if (classificationId) fd.append('classification_id', classificationId);
      // Use manual OE hint if provided, otherwise auto-extract from folder
      if (manualOeHint) fd.append('folder_hint', manualOeHint);
      return fd;
    };

    try {
      if (total === 1) {
        updateProgress('上传中', 0, uploadFiles[0].name);
        const fd = new FormData();
        fd.append('file', uploadFiles[0]);
        if (classificationId) fd.append('classification_id', classificationId);
        // Priority: manual OE hint > folder name > filename
        if (manualOeHint) {
          fd.append('folder_hint', manualOeHint);
        } else {
          const relPath = (uploadFiles[0] as any).webkitRelativePath || '';
          if (relPath) {
            const parts = relPath.split('/');
            if (parts.length >= 2) fd.append('folder_hint', parts[parts.length - 2]);
          }
        }
        await api.post('/assets/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        success = 1; bytesUploaded = uploadFiles[0].size;
        fileLog[0].status = 'ok';
      } else {
        const batches: File[][] = [];
        for (let i = 0; i < total; i += BATCH_SIZE) batches.push(uploadFiles.slice(i, i + BATCH_SIZE));

        for (let bi = 0; bi < batches.length; bi++) {
          const batch = batches[bi];
          const batchStart = bi * BATCH_SIZE;
          const batchBytes = batch.reduce((s, f) => s + f.size, 0);

          // Retry logic for 502/503/504 errors
          let batchResults: any[] | null = null;
          let lastError = '';
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            updateProgress(`批次 ${bi + 1}/${batches.length}${attempt > 0 ? ` (重试${attempt})` : ''}`, batchStart, batch[0]?.name || '');
            try {
              const fd = buildBatchFd(batch);
              const { data: res } = await api.post('/assets/batch-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000 });
              batchResults = res.data || res || [];
              break; // success
            } catch (err: any) {
              lastError = err.response?.data?.message || err.message;
              if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); // backoff
              }
            }
          }

          if (batchResults && Array.isArray(batchResults)) {
            const batchFileNames = batch.map(f => f.name);
            // Process each file result individually for real-time progress
            for (let idx = 0; idx < batch.length; idx++) {
              const fileIdx = batchStart + idx;
              const r = batchResults[idx];
              if (r && r.success) {
                success++; fileLog[fileIdx].status = 'ok'; bytesUploaded += batch[idx].size;
              } else if (r) {
                failed++; fileLog[fileIdx].status = 'fail'; fileLog[fileIdx].error = r.error;
                errors.push(`${r.file || batchFileNames[idx]}: ${r.error}`);
              } else {
                failed++; fileLog[fileIdx].status = 'fail'; fileLog[fileIdx].error = '服务器未返回结果';
                errors.push(`${batch[idx].name}: 服务器未返回结果`);
              }
              // Update progress after each file
              setUploadProgress(prev => prev ? { ...prev, current: fileIdx + 1, success, failed, errors, bytesUploaded, fileLog: [...fileLog], currentFile: batch[idx].name } : prev);
            }
          } else {
            // Entire batch failed after retries
            for (let fi = 0; fi < batch.length; fi++) {
              failed++; fileLog[batchStart + fi].status = 'fail'; fileLog[batchStart + fi].error = lastError;
            }
            errors.push(`批次 ${bi + 1}: ${lastError} (重试${MAX_RETRIES}次)`);
            setUploadProgress(prev => prev ? { ...prev, current: batchStart + batch.length, failed, errors, fileLog: [...fileLog] } : prev);
          }
          bytesUploaded += batchBytes;
        }
      }
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? formatBytes(bytesUploaded / elapsed) + '/s' : '-';
      setUploadProgress({ phase: '完成', current: total, total, success, failed, errors, done: true, speed, currentFile: '', bytesUploaded, bytesTotal, startTime, fileLog });
      setTimeout(() => { setShowUpload(false); setUploadFiles([]); setUploadFolderHint(''); setManualOeHint(''); setUploadProgress(null); fetchAssets(); }, 5000);
    } catch (err: any) {
      errors.push(err.response?.data?.message || err.message);
      setUploadProgress({ phase: '失败', current: 0, total, success, failed, errors, done: true, speed: '-', currentFile: '', bytesUploaded, bytesTotal, startTime, fileLog });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({ message: '确定删除此素材？', variant: 'danger' });
      if (!confirmed) return;
    try {
      await api.delete(`/assets/${id}`);
      setPreviewAsset(null);
      fetchAssets();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === assets.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.items.map(a => a.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.size) return;
    const confirmed = await confirm({ message: `确定删除 ${selectedIds.size} 个素材？`, variant: "danger" });
      if (!confirmed) return;
    const ids = Array.from(selectedIds);
    setBatchProgress({ active: true, title: '批量删除', total: ids.length, current: 0, success: 0, failed: 0, done: false });
    try {
      const { data: res } = await api.post('/assets/batch-delete', { ids });
      const r = res.data || res;
      setBatchProgress(p => ({ ...p, current: ids.length, success: r.deleted || ids.length, done: true }));
    } catch (err: any) {
      const msg = err.response?.data?.message || '删除失败';
      alert(msg);
      setBatchProgress(p => ({ ...p, failed: ids.length, done: true }));
    }
    setSelectedIds(new Set());
    fetchAssets();
  };

  const handleBatchClassify = async () => {
    if (!selectedIds.size || !batchClassId) return;
    const ids = Array.from(selectedIds);
    setShowBatchClassify(false);
    setBatchProgress({ active: true, title: '批量分类', total: ids.length, current: 0, success: 0, failed: 0, done: false });
    try {
      await api.post('/assets/batch-classify', { ids, classification_id: Number(batchClassId) });
      setBatchProgress(p => ({ ...p, current: ids.length, success: ids.length, done: true }));
    } catch {
      setBatchProgress(p => ({ ...p, failed: ids.length, done: true }));
    }
    setSelectedIds(new Set());
    setBatchClassId('');
    fetchAssets();
  };

  const handleRecognize = async (id: number, options: { ocr?: boolean; ai?: boolean; oeLookup?: boolean }) => {
    setRecognizing(true);
    try {
      const { data: res } = await api.post(`/assets/${id}/recognize`, options);
      const result = res.data || res;
      setPreviewAsset(result);
      fetchAssets();
    } catch (err: any) {
      error(err.response?.data?.message || '识别失败');
    } finally {
      setRecognizing(false);
    }
  };

  const handleBatchRecognize = async (options: { ocr?: boolean; ai?: boolean; oeLookup?: boolean }) => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    const label = options.ocr && options.ai && options.oeLookup ? '全部识别' : options.ocr ? '批量 OCR' : options.ai ? '批量 AI 识别' : '批量 OE 查询';
    setRecognizing(true);
    setBatchProgress({ active: true, title: label, total: ids.length, current: 0, success: 0, failed: 0, done: false });
    try {
      const { data: res } = await api.post('/assets/batch-recognize', { ids, ...options });
      const result = res.data || res;
      setBatchProgress(p => ({ ...p, current: result.processed || ids.length, success: (result.processed || 0) - (result.failed || 0), failed: result.failed || 0, done: true }));
      setSelectedIds(new Set());
      fetchAssets();
    } catch (err: any) {
      setBatchProgress(p => ({ ...p, failed: ids.length, done: true }));
    } finally {
      setRecognizing(false);
    }
  };

  const handleUndoRecognize = async (id: number) => {
    setRecognizing(true);
    try {
      const { data: res } = await api.post(`/assets/${id}/undo-recognize`);
      setPreviewAsset(res.data || res);
      fetchAssets();
    } catch (err: any) {
      error(err.response?.data?.message || '撤销失败');
    } finally {
      setRecognizing(false);
    }
  };

  const handleExtractOe = async (id: number) => {
    setRecognizing(true);
    try {
      const { data: res } = await api.post(`/assets/${id}/extract-oe`);
      const result = res.data || res;
      if (result.success) {
        success(result.message);
        // Refresh preview
        const { data: assetRes } = await api.get(`/assets/${id}`);
        setPreviewAsset(assetRes.data || assetRes);
        fetchAssets();
      } else {
        warning(result.message);
      }
    } catch (err: any) {
      error(err.response?.data?.message || '提取OE号失败');
    } finally {
      setRecognizing(false);
    }
  };

  const handleBatchExtractOe = async () => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    setRecognizing(true);
    setBatchProgress({ active: true, title: '提取OE号', total: ids.length, current: 0, success: 0, failed: 0, done: false });
    try {
      const { data: res } = await api.post('/assets/batch-extract-oe', { ids });
      const result = res.data || res;
      setBatchProgress(p => ({
        ...p,
        current: ids.length,
        success: result.processed || 0,
        failed: result.failed || 0,
        done: true
      }));
      success(`提取完成：${result.matched || 0} 个匹配到配件`);
      setSelectedIds(new Set());
      fetchAssets();
    } catch (err: any) {
      error(err.response?.data?.message || '批量提取失败');
      setBatchProgress(p => ({ ...p, failed: ids.length, done: true }));
    } finally {
      setRecognizing(false);
    }
  };

  const handleBatchUndoRecognize = async () => {
    if (!selectedIds.size) return;
    const confirmed = await confirm({ message: `确定撤销 ${selectedIds.size} 个素材的识别结果？`, variant: "danger" });
      if (!confirmed) return;
    const ids = Array.from(selectedIds);
    setRecognizing(true);
    setBatchProgress({ active: true, title: '撤销识别', total: ids.length, current: 0, success: 0, failed: 0, done: false });
    try {
      const { data: res } = await api.post('/assets/batch-undo-recognize', { ids });
      const result = res.data || res;
      setBatchProgress(p => ({ ...p, current: result.processed || ids.length, success: (result.processed || 0) - (result.failed || 0), failed: result.failed || 0, done: true }));
      setSelectedIds(new Set());
      fetchAssets();
    } catch {
      setBatchProgress(p => ({ ...p, failed: ids.length, done: true }));
    } finally {
      setRecognizing(false);
    }
  };

  const handleBatchDownload = async () => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    setBatchProgress({ active: true, title: '批量下载', total: ids.length, current: 0, success: 0, failed: 0, done: false });
    try {
      const zip = new JSZip();
      let success = 0;
      let failed = 0;
      for (let i = 0; i < ids.length; i++) {
        try {
          const { data: res } = await api.get(`/assets/${ids[i]}`);
          const asset = res.data || res;
          const resp = await fetch(imageUrl(asset.filePath));
          if (!resp.ok) throw new Error('下载失败');
          const blob = await resp.blob();
          zip.file(asset.fileName, blob);
          success++;
        } catch {
          failed++;
        }
        setBatchProgress(p => ({ ...p, current: i + 1, success, failed }));
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `素材下载_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBatchProgress(p => ({ ...p, done: true }));
    } catch {
      setBatchProgress(p => ({ ...p, done: true, failed: ids.length }));
    }
  };

  const handleSaveEdit = async () => {
    if (!previewAsset) return;
    setSavingEdit(true);
    try {
      // Read from refs (uncontrolled) first, fall back to state
      const payload = {
        recognized_oe_number: oeRef.current?.value ?? editFields.recognizedOeNumber,
        recognized_part_type: typeRef.current?.value ?? editFields.recognizedPartType,
        recognized_brand: brandRef.current?.value ?? editFields.recognizedBrand,
        part_name_cn: cnRef.current?.value ?? editFields.partNameCn,
        part_name_en: enRef.current?.value ?? editFields.partNameEn,
      };
      const { data: res } = await api.put(`/assets/${previewAsset.id}`, payload);
      const result = res.data || res;
      setPreviewAsset(result);
      fetchAssets();
    } catch (err: any) {
      error(err.response?.data?.message || '保存失败');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyImage = async () => {
    if (!previewAsset || copyState === 'copying') return;
    setCopyState('copying');
    try {
      const resp = await fetch(imageUrl(previewAsset.filePath));
      if (!resp.ok) throw new Error('下载失败');
      const originalBlob = await resp.blob();

      // Convert to PNG via canvas to ensure proper MIME type for clipboard
      const bitmap = await createImageBitmap(originalBlob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const pngBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas toBlob failed')), 'image/png');
      });

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (err: any) {
      console.error('Copy failed:', err);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  };

  const handleBatchEdit = async () => {
    if (!selectedIds.size) return;
    const payload: any = {};
    if (batchEditFields.recognizedOeNumber) payload.recognized_oe_number = batchEditFields.recognizedOeNumber;
    if (batchEditFields.recognizedPartType) payload.recognized_part_type = batchEditFields.recognizedPartType;
    if (batchEditFields.recognizedBrand) payload.recognized_brand = batchEditFields.recognizedBrand;
    if (batchEditFields.partNameCn) payload.part_name_cn = batchEditFields.partNameCn;
    if (batchEditFields.partNameEn) payload.part_name_en = batchEditFields.partNameEn;
    if (Object.keys(payload).length === 0) { warning('请至少填写一个字段'); return; }
    const ids = Array.from(selectedIds);
    setShowBatchEdit(false);
    setBatchProgress({ active: true, title: '批量修改', total: ids.length, current: 0, success: 0, failed: 0, done: false });
    let successCount = 0, failedCount = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        await api.put(`/assets/${ids[i]}`, payload);
        successCount++;
      } catch {
        failedCount++;
      }
      setBatchProgress({ active: true, title: '批量修改', total: ids.length, current: i + 1, success: successCount, failed: failedCount, done: i + 1 === ids.length });
    }
    setSelectedIds(new Set());
    setBatchEditFields({ recognizedOeNumber: '', recognizedPartType: '', recognizedBrand: '', partNameCn: '', partNameEn: '' });
    fetchAssets();
  };

  // Import source handlers
  const openCreateSource = () => {
    setEditSource(null);
    setSourceForm({ name: '', protocol: 'webdav', ssl: false, host: '', port: '', path: '', username: '', password: '', local_mount_path: '', remote_path: '/', auto_classify: true, folder_mapping: {}, scan_interval: 0 });
    setShowForm(true);
  };

  const openEditSource = (s: ImportSource) => {
    setEditSource(s);
    // Parse URL into host/port/path/ssl
    let host = '', port = '', urlPath = '', ssl = false;
    if (s.url) {
      try {
        // Handle various URL formats
        let urlStr = s.url;
        if (!urlStr.match(/^https?:\/\//) && !urlStr.match(/^ftps?:\/\//)) {
          urlStr = `http://${urlStr}`;
        }
        const u = new URL(urlStr);
        host = u.hostname;
        port = u.port || '';
        urlPath = u.pathname && u.pathname !== '/' ? u.pathname : '';
        ssl = u.protocol === 'https:' || u.protocol === 'ftps:';
      } catch {
        host = s.url;
      }
    }
    setSourceForm({
      name: s.name, protocol: s.protocol, ssl, host, port, path: urlPath, username: s.username, password: s.password,
      local_mount_path: s.localMountPath || '', remote_path: s.remotePath || '/', auto_classify: s.autoClassify, folder_mapping: s.folderMapping || {},
      scan_interval: s.scanInterval || 0,
    });
    setShowForm(true);
  };

  const handleSaveSource = async () => {
    if (!sourceForm.name.trim()) return;
    // Construct URL from host+port+path
    const { host, port, path: urlPath, ssl, ...rest } = sourceForm;
    let url = '';
    if (host) {
      // If host already contains protocol, use as-is
      if (host.includes('://')) {
        const u = new URL(host);
        url = port ? `${u.protocol}//${u.hostname}:${port}${urlPath || u.pathname || '/'}` : host + (urlPath || '');
      } else {
        let proto: string;
        if (sourceForm.protocol === 'webdav') {
          proto = ssl ? 'https' : 'http';
        } else {
          proto = ssl ? 'ftps' : 'ftp';
        }
        url = port ? `${proto}://${host}:${port}${urlPath || '/'}` : `${proto}://${host}${urlPath || '/'}`;
      }
    }
    const body = { ...rest, url };
    try {
      if (editSource) {
        await api.put(`/assets/sources/${editSource.id}`, body);
      } else {
        await api.post('/assets/sources', body);
      }
      setEditSource(null);
      setShowForm(false);
      fetchSources();
    } catch (err: any) {
      error(err.response?.data?.message || '保存失败');
    }
  };

  const handleDeleteSource = async (id: number) => {
    const confirmed = await confirm({ message: '确定删除此导入源？', variant: 'danger' });
      if (!confirmed) return;
    try {
      await api.delete(`/assets/sources/${id}`);
      fetchSources();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const handleTestSource = async (id: number) => {
    setTesting(id);
    try {
      const { data: res } = await api.post(`/assets/sources/${id}/test`);
      const d = res.data || res;
      let msg = d.message || (d.success ? '连接成功' : '连接失败');
      if (d.sampleFiles?.length) {
        msg += `\n\n示例文件:\n${d.sampleFiles.join('\n')}`;
      }
      alert(msg);
    } catch (err: any) {
      error(err.response?.data?.message || '测试失败');
    } finally {
      setTesting(null);
    }
  };

  const startImport = async (id: number) => {
    try {
      await api.post(`/assets/sources/${id}/import`);
      setImporting(id);
      setImportProgress({ status: 'scanning', progress: null, errorMessage: '' });
      pollImportProgress(id);
    } catch (err: any) {
      error(err.response?.data?.message || '启动导入失败');
    }
  };

  const stopImport = async (id: number) => {
    try {
      await api.post(`/assets/sources/${id}/stop`);
      // If still importing after 3 seconds, force stop
      setTimeout(async () => {
        if (importing === id) {
          try {
            await api.post(`/assets/sources/${id}/force-stop`);
            setImporting(null);
            fetchSources();
          } catch {}
        }
      }, 3000);
    } catch (err: any) {
      error(err.response?.data?.message || '停止失败');
    }
  };

  const pollImportProgress = (id: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data: res } = await api.get(`/assets/sources/${id}/progress`);
        const d = res.data || res;
        setImportProgress(d);
        // Refresh sources list to update status badges
        fetchSources();
        if (d.status === 'idle' || d.status === 'error') {
          // Import finished
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setImporting(null);
          fetchAssets();
          if (d.status === 'error') {
            success(`导入出错: ${d.errorMessage}`);
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
  };

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const addFolderMapping = () => {
    if (!newMapFolder.trim() || !newMapClassId) return;
    setSourceForm(prev => ({ ...prev, folder_mapping: { ...prev.folder_mapping, [newMapFolder.trim()]: parseInt(newMapClassId) } }));
    setNewMapFolder('');
    setNewMapClassId('');
  };

  const removeFolderMapping = (folder: string) => {
    setSourceForm(prev => {
      const m = { ...prev.folder_mapping };
      delete m[folder];
      return { ...prev, folder_mapping: m };
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle size={14} className="text-green-500" />;
      case 'processing': return <Loader2 size={14} className="text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle size={14} className="text-red-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getSourceStatusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      idle: { label: '空闲', color: 'green' },
      scanning: { label: '扫描中', color: 'blue' },
      importing: { label: '导入中', color: 'yellow' },
      error: { label: '错误', color: 'red' },
    };
    const s = map[status] || { label: status, color: 'gray' };
    return <Badge color={s.color}>{s.label}</Badge>;
  };

  const protocolLabels: Record<string, string> = { webdav: 'WebDAV', ftp: 'FTP/SFTP', smb_mount: 'SMB 本地挂载' };

  const imageUrl = (path: string) => `/uploads/${path}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">素材管理</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowClassManager(true)}>分类管理</Button>
          <Button variant="secondary" onClick={() => { setShowSources(true); fetchSources(); }}><Globe size={16} className="mr-1" />远程导入</Button>
          <Button onClick={openFolderPicker}><Folder size={16} className="mr-1" />上传文件夹</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="搜索文件名、OCR 文字..." value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
          </div>
          <select className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" value={classificationId} onChange={(e) => { setClassificationId(e.target.value); setPage(1); }}>
            <option value="">全部分类</option>
            {classifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-40" placeholder="OE 编号..." value={oeFilter} onChange={(e) => { setOeFilter(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto text-gray-400 mb-2" size={32} />
        <p className="text-sm text-gray-500">拖拽图片或视频到此处，或点击选择文件</p>
        <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、WebP、GIF、MP4、WebM、MOV，图片最大 10MB，视频最大 200MB</p>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50/80 rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-700">已选 {selectedIds.size} 项</span>
          <button onClick={handleBatchDelete} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">批量删除</button>
          <button onClick={() => setShowBatchClassify(true)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">批量分类</button>
          <button onClick={() => setShowBatchEdit(true)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">批量修改</button>
          <button onClick={handleBatchDownload} className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 flex items-center gap-1"><Download size={14} />批量下载</button>
          <button onClick={handleBatchExtractOe} disabled={recognizing} className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 disabled:opacity-50">批量提取OE</button>
          <button onClick={() => handleBatchRecognize({ ocr: true })} disabled={recognizing} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">批量 OCR</button>
          <button onClick={() => handleBatchRecognize({ ai: true })} disabled={recognizing} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50">批量 AI 识别</button>
          <button onClick={() => handleBatchRecognize({ oeLookup: true })} disabled={recognizing} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50">批量 OE 查询</button>
          <button onClick={() => handleBatchRecognize({ ocr: true, ai: true, oeLookup: true })} disabled={recognizing} className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-lg text-sm hover:shadow-lg disabled:opacity-50">全部识别</button>
          <button onClick={handleBatchUndoRecognize} disabled={recognizing} className="px-3 py-1.5 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50">撤销识别</button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm ml-auto">取消选择</button>
        </div>
      )}

      {/* Image Grid */}
      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={assets.items.length > 0 && selectedIds.size === assets.items.length} onChange={toggleSelectAll} className="rounded" />
          全选
        </label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {assets.items.map(asset => (
          <div
            key={asset.id}
            className={`group bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${selectedIds.has(asset.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
            onClick={() => setPreviewAsset(asset)}
          >
            <div className="aspect-square relative bg-gray-100">
              {asset.type === 'video' ? (
                <>
                  {asset.thumbnailMediumPath ? (
                    <LazyImage src={imageUrl(asset.thumbnailMediumPath)} alt={asset.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Play size={32} className="text-white/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                      <Play size={24} className="text-white ml-1" />
                    </div>
                  </div>
                  {asset.duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {Math.floor(asset.duration / 60)}:{String(Math.floor(asset.duration % 60)).padStart(2, '0')}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {asset.thumbnailMediumPath ? (
                    <LazyImage src={imageUrl(asset.thumbnailMediumPath)} alt={asset.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">无图</div>
                  )}
                </>
              )}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(asset.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(asset.id, e as any); }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded w-4 h-4"
                />
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                {asset.type === 'video' ? (
                  <div className="bg-white/90 rounded-full p-1" title="视频"><Play size={14} className="text-blue-500" /></div>
                ) : (
                  <>
                    <div className="bg-white/90 rounded-full p-1" title={`OCR: ${asset.ocrStatus}`}>{getStatusIcon(asset.ocrStatus)}</div>
                    <div className="bg-white/90 rounded-full p-1" title={`识别: ${asset.recognitionStatus}`}>{getStatusIcon(asset.recognitionStatus)}</div>
                  </>
                )}
              </div>
              {asset.recognizedOeNumber && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs font-mono truncate">{asset.recognizedOeNumber}</p>
                  {asset.partNameCn && <p className="text-white/80 text-xs truncate">{asset.partNameCn}</p>}
                </div>
              )}
            </div>
            <div className="p-2">
              {asset.recognizedOeNumber ? (
                <>
                  <p className="text-sm font-mono font-semibold text-blue-700 truncate">{asset.recognizedOeNumber}</p>
                  {asset.partNameCn && <p className="text-xs text-gray-700 truncate">{asset.partNameCn}</p>}
                  {asset.partNameEn && <p className="text-xs text-gray-400 truncate">{asset.partNameEn}</p>}
                </>
              ) : (
                <p className="text-xs text-gray-500 truncate">{asset.fileName}</p>
              )}
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {asset.recognizedPartType && <Badge color="blue">{asset.recognizedPartType}</Badge>}
                {asset.recognizedBrand && <Badge>{asset.recognizedBrand}</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} pageSize={30} total={assets.total} onChange={setPage} />

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => { if (!uploadProgress || uploadProgress.done) { setShowUpload(false); setUploadFiles([]); setUploadFolderHint(''); setManualOeHint(''); setUploadProgress(null); } }} title={uploadFolderHint ? `上传文件夹 — OE: ${uploadFolderHint}` : '上传素材'} size="lg">
        <div className="space-y-4">
          {uploadFolderHint && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
              📁 文件夹OE号: <strong>{uploadFolderHint}</strong> — 图片将自动关联此OE号
            </div>
          )}
          <OeHintInput value={manualOeHint} onChange={setManualOeHint} folderHint={uploadFolderHint} />
          {uploadProgress && (
            <div className="space-y-3">
              {/* Header stats */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">进度</p>
                  <p className="text-sm font-bold text-blue-700">{uploadProgress.current}/{uploadProgress.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">成功</p>
                  <p className="text-sm font-bold text-green-700">{uploadProgress.success}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">失败</p>
                  <p className="text-sm font-bold text-red-700">{uploadProgress.failed}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">速率</p>
                  <p className="text-sm font-bold text-purple-700">{uploadProgress.speed}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{uploadProgress.phase}</span>
                  <span>{formatBytes(uploadProgress.bytesUploaded)} / {formatBytes(uploadProgress.bytesTotal)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${uploadProgress.done && uploadProgress.failed > 0 ? 'bg-yellow-500' : uploadProgress.done ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total * 100) : 0}%` }}
                  />
                </div>
                {uploadProgress.currentFile && !uploadProgress.done && (
                  <p className="text-xs text-gray-400 mt-1 truncate">当前: {uploadProgress.currentFile}</p>
                )}
              </div>

              {/* File log */}
              {uploadProgress.fileLog.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div ref={fileLogRef} className="max-h-48 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-2 py-1 text-left w-8">#</th>
                          <th className="px-2 py-1 text-left">文件</th>
                          <th className="px-2 py-1 text-left">OE号</th>
                          <th className="px-2 py-1 text-center">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadProgress.fileLog.map((f, i) => (
                          <tr key={i} className={`border-t ${f.status === 'ok' ? 'bg-green-50/30' : f.status === 'fail' ? 'bg-red-50/30' : f.status === 'pending' && i === uploadProgress.current ? 'bg-blue-50/50' : ''}`}>
                            <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                            <td className="px-2 py-1 truncate max-w-[180px]" title={f.name}>{f.name}</td>
                            <td className="px-2 py-1 font-mono text-blue-600">{f.oe}</td>
                            <td className="px-2 py-1 text-center">
                              {f.status === 'ok' && <span className="text-green-600">✓</span>}
                              {f.status === 'fail' && <span className="text-red-600 cursor-help" title={f.error || '未知错误'}>✗</span>}
                              {f.status === 'pending' && <span className="text-gray-300">⏳</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Error summary */}
              {uploadProgress.errors.length > 0 && uploadProgress.done && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 max-h-20 overflow-auto">
                  {uploadProgress.errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                  {uploadProgress.errors.length > 10 && <p className="text-xs text-red-400">...还有 {uploadProgress.errors.length - 10} 个错误</p>}
                </div>
              )}
            </div>
          )}
          {uploadFiles.length > 0 && !uploadProgress && (
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-auto">
              {uploadFiles.map((f, i) => (
                <div key={i} className="relative">
                  {f.type.startsWith('video/') ? (
                    <div className="w-full h-16 bg-gray-800 rounded flex items-center justify-center">
                      <Play size={20} className="text-white" />
                    </div>
                  ) : (
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-16 object-cover rounded" />
                  )}
                  <p className="text-xs text-gray-500 truncate mt-0.5">{f.name}</p>
                  <button className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center" onClick={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          <select className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" value={classificationId} onChange={(e) => setClassificationId(e.target.value)}>
            <option value="">选择分类（可选）</option>
            {classifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { if (!uploadProgress || uploadProgress.done) { setShowUpload(false); setUploadFiles([]); setUploadFolderHint(''); setManualOeHint(''); setUploadProgress(null); } }}>
              {uploadProgress?.done ? '关闭' : '取消'}
            </Button>
            {!uploadProgress?.done && (
              <Button onClick={handleUpload} disabled={!uploadFiles.length || !!uploadProgress}>
                {uploadProgress ? '上传中...' : `上传 ${uploadFiles.length} 个文件`}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Preview Modal — Portal to body to escape overflow-auto stacking context */}
      {previewAsset && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-black/60" onClick={() => setPreviewAsset(null)} />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <h3 className="text-lg font-semibold">素材详情</h3>
              <button onClick={() => setPreviewAsset(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={20} /></button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-auto p-6">
              <div className="flex gap-6">
                {/* Left: Image */}
                <div className="flex-1 min-w-0">
                  {previewAsset.type === 'video' ? (
                    <video src={imageUrl(previewAsset.filePath)} poster={previewAsset.thumbnailLargePath ? imageUrl(previewAsset.thumbnailLargePath) : undefined} controls autoPlay className="w-full rounded-lg max-h-[60vh]" />
                  ) : (
                    <img src={imageUrl(previewAsset.filePath)} alt={previewAsset.fileName} className="w-full rounded-lg max-h-[60vh] object-contain bg-gray-50" />
                  )}
                  {/* File info */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{previewAsset.fileName}</span>
                    <span>{previewAsset.type === 'video' ? '视频' : '图片'}</span>
                    <span>{previewAsset.width} × {previewAsset.height}</span>
                    {previewAsset.type === 'video' && previewAsset.duration > 0 && <span>{Math.floor(previewAsset.duration / 60)}分{Math.floor(previewAsset.duration % 60)}秒</span>}
                  </div>
                  {/* Copy & Download buttons centered */}
                  <div className="flex justify-center gap-3 mt-3">
                    {previewAsset.type !== 'video' && (
                      <button
                        onClick={handleCopyImage}
                        disabled={copyState === 'copying'}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition bg-white hover:bg-green-50 border-green-300 text-green-700 disabled:opacity-50"
                      >
                        <Copy size={16} />
                        {copyState === 'copying' ? '复制中...' : copyState === 'copied' ? '已复制 ✓' : copyState === 'error' ? '复制失败' : '复制图片'}
                      </button>
                    )}
                    <a
                      href={imageUrl(previewAsset.filePath)}
                      download={previewAsset.fileName}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
                    >
                      <Download size={16} />
                      {previewAsset.type === 'video' ? '下载视频' : '下载原图'}
                    </a>
                  </div>
                </div>
                {/* Right: Edit fields — uncontrolled inputs with refs */}
                  <div className="w-80 shrink-0 space-y-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">配件信息</h4>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">OE 编号</label>
                        <input ref={oeRef} type="text" autoFocus className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm font-mono focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all duration-150" defaultValue="" placeholder="如 27300-3F100" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">配件类型</label>
                        <input ref={typeRef} type="text" className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all duration-150" defaultValue="" placeholder="如 火花塞" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">品牌</label>
                        <input ref={brandRef} type="text" className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all duration-150" defaultValue="" placeholder="如 NGK" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">中文名</label>
                        <input ref={cnRef} type="text" className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all duration-150" defaultValue="" placeholder="配件中文名" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">英文名</label>
                        <input ref={enRef} type="text" className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all duration-150" defaultValue="" placeholder="Part name" />
                      </div>
                      <button onClick={handleSaveEdit} disabled={savingEdit} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                        {savingEdit ? '保存中...' : '保存修改'}
                      </button>
                    </div>
                    {/* OCR text */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 border-b pb-2 mb-2">识别状态</h4>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center gap-1 text-xs">{getStatusIcon(previewAsset.ocrStatus)} OCR</span>
                        <span className="inline-flex items-center gap-1 text-xs">{getStatusIcon(previewAsset.recognitionStatus)} AI识别</span>
                      </div>
                      <div className="text-xs text-gray-600 max-h-24 overflow-auto bg-gray-50 p-3 rounded-lg border">{previewAsset.ocrText || '无 OCR 文字'}</div>
                    </div>
                    {/* Actions */}
                    <div className="border-t pt-3 space-y-2">
                      <button onClick={() => handleDelete(previewAsset.id)} className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition">删除素材</button>
                      <p className="text-xs text-gray-500 font-medium">手动识别</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleExtractOe(previewAsset.id)} disabled={recognizing} className="px-3 py-2 bg-cyan-500 text-white rounded-lg text-xs hover:bg-cyan-600 disabled:opacity-50 transition">{recognizing ? '...' : '提取OE号'}</button>
                        <button onClick={() => handleRecognize(previewAsset.id, { ocr: true })} disabled={recognizing} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs hover:bg-orange-600 disabled:opacity-50 transition">{recognizing ? '...' : 'OCR'}</button>
                        <button onClick={() => handleRecognize(previewAsset.id, { ai: true })} disabled={recognizing} className="px-3 py-2 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600 disabled:opacity-50 transition">{recognizing ? '...' : 'AI 识别'}</button>
                        <button onClick={() => handleRecognize(previewAsset.id, { oeLookup: true })} disabled={recognizing} className="px-3 py-2 bg-teal-500 text-white rounded-lg text-xs hover:bg-teal-600 disabled:opacity-50 transition">{recognizing ? '...' : 'OE 查询'}</button>
                        <button onClick={() => handleRecognize(previewAsset.id, { ocr: true, ai: true, oeLookup: true })} disabled={recognizing} className="col-span-2 px-3 py-2 bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-lg text-xs hover:shadow-lg disabled:opacity-50 transition">{recognizing ? '...' : '全部识别'}</button>
                      </div>
                      <button onClick={() => handleUndoRecognize(previewAsset.id)} disabled={recognizing} className="w-full px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 disabled:opacity-50 transition">撤销识别</button>
                    </div>
                  </div>
              </div>
            </div>
          </div>
          </div>
        </>,
        document.body,
      )}

      {/* Classification Manager */}
      {showClassManager && (
        <ClassificationManager
          classifications={classifications}
          onClose={() => setShowClassManager(false)}
          onRefresh={fetchMeta}
        />
      )}

      {/* Batch Classify Modal */}
      <Modal isOpen={showBatchClassify} onClose={() => { setShowBatchClassify(false); setBatchClassId(''); }} title="批量分类" size="sm">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{selectedIds.size}</div>
            <div>
              <p className="text-sm font-medium text-gray-900">已选择 {selectedIds.size} 个素材</p>
              <p className="text-xs text-gray-500">将统一设置为以下分类</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">目标分类</label>
            <select className="w-full px-3 py-2.5 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150" value={batchClassId} onChange={(e) => setBatchClassId(e.target.value)}>
              <option value="">请选择分类</option>
              {classifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => { setShowBatchClassify(false); setBatchClassId(''); }} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
            <button onClick={handleBatchClassify} disabled={!batchClassId} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">确认分类</button>
          </div>
        </div>
      </Modal>

      {/* Batch Edit Modal */}
      <Modal isOpen={showBatchEdit} onClose={() => { setShowBatchEdit(false); setBatchEditFields({ recognizedOeNumber: '', recognizedPartType: '', recognizedBrand: '', partNameCn: '', partNameEn: '' }); }} title="批量修改信息" size="md">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">{selectedIds.size}</div>
            <div>
              <p className="text-sm font-medium text-gray-900">已选择 {selectedIds.size} 个素材</p>
              <p className="text-xs text-gray-500">留空的字段不会被修改</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">OE 编号</label>
              <input className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150" value={batchEditFields.recognizedOeNumber} onChange={(e) => setBatchEditFields(prev => ({ ...prev, recognizedOeNumber: e.target.value }))} placeholder="如 27300-3F100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">配件类型</label>
              <input className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150" value={batchEditFields.recognizedPartType} onChange={(e) => setBatchEditFields(prev => ({ ...prev, recognizedPartType: e.target.value }))} placeholder="如 火花塞" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
              <input className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150" value={batchEditFields.recognizedBrand} onChange={(e) => setBatchEditFields(prev => ({ ...prev, recognizedBrand: e.target.value }))} placeholder="如 NGK" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">中文名</label>
              <input className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150" value={batchEditFields.partNameCn} onChange={(e) => setBatchEditFields(prev => ({ ...prev, partNameCn: e.target.value }))} placeholder="配件中文名" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">英文名</label>
              <input className="w-full px-3 py-2 border rounded-lg border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150" value={batchEditFields.partNameEn} onChange={(e) => setBatchEditFields(prev => ({ ...prev, partNameEn: e.target.value }))} placeholder="Part name" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => { setShowBatchEdit(false); setBatchEditFields({ recognizedOeNumber: '', recognizedPartType: '', recognizedBrand: '', partNameCn: '', partNameEn: '' }); }} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
            <button onClick={handleBatchEdit} className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">确认修改</button>
          </div>
        </div>
      </Modal>

      {/* Batch Progress Modal */}
      <Modal isOpen={batchProgress.active} onClose={() => { if (batchProgress.done) setBatchProgress(p => ({ ...p, active: false })); }} title={batchProgress.title} size="sm">
        <div className="space-y-5">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {batchProgress.done ? '操作完成' : '处理中...'}
              </span>
              <span className="text-sm font-mono text-gray-500">
                {batchProgress.total > 0 ? Math.round((batchProgress.current / batchProgress.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              {batchProgress.done ? (
                <div className="h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300" style={{ width: '100%' }} />
              ) : batchProgress.total > 0 ? (
                <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 animate-pulse" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
              ) : (
                <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse w-full" />
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{batchProgress.current}</p>
              <p className="text-xs text-blue-500">已完成</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{batchProgress.success}</p>
              <p className="text-xs text-green-500">成功</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{batchProgress.failed}</p>
              <p className="text-xs text-red-500">失败</p>
            </div>
          </div>

          {/* Total */}
          <p className="text-center text-sm text-gray-500">
            共 {batchProgress.total} 个素材
          </p>

          {/* Close button */}
          {batchProgress.done && (
            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setBatchProgress(p => ({ ...p, active: false }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                完成
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Import Sources Modal */}
      <Modal isOpen={showSources} onClose={() => { setShowSources(false); setShowForm(false); }} title="" size="3xl">
        <div>
          {/* Custom header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Globe size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">远程导入源</h2>
                <p className="text-sm text-gray-500">从 WebDAV、FTP 等服务器批量导入图片</p>
              </div>
            </div>
            <button
              onClick={openCreateSource}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-violet-500/30 transition-all"
            >
              <Plus size={18} />新建导入源
            </button>
          </div>

          {/* Horizontal layout: Left = sources list, Right = form */}
          <div className="flex gap-6">
            {/* Left: Source cards */}
            <div className="w-72 flex-shrink-0">
              {sources.length > 0 ? (
                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                  {sources.map(s => {
                    const colors: Record<string, string> = {
                      webdav: 'from-blue-500 to-cyan-500',
                      ftp: 'from-orange-500 to-amber-500',
                      smb_mount: 'from-green-500 to-emerald-500',
                    };
                    return (
                      <div
                        key={s.id}
                        onClick={() => openEditSource(s)}
                        className={`relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 ${
                          editSource?.id === s.id
                            ? 'bg-gradient-to-br ' + (colors[s.protocol] || 'from-gray-500 to-gray-600') + ' text-white shadow-xl'
                            : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg'
                        }`}
                      >
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-2">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              editSource?.id === s.id ? 'bg-white/20' : 'bg-gradient-to-br ' + (colors[s.protocol] || 'from-gray-500 to-gray-600')
                            }`}>
                              <Globe size={18} className="text-white" />
                            </div>
                            {s.status === 'idle' ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                editSource?.id === s.id ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                              }`}>就绪</span>
                            ) : s.status === 'error' ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                editSource?.id === s.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                              }`}>错误</span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                editSource?.id === s.id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                              }`}>{s.status === 'importing' ? '导入中' : '扫描中'}</span>
                            )}
                          </div>
                          <h3 className={`font-semibold mb-0.5 ${editSource?.id === s.id ? 'text-white' : 'text-gray-900'}`}>{s.name}</h3>
                          <p className={`text-xs ${editSource?.id === s.id ? 'text-white/80' : 'text-gray-500'}`}>{protocolLabels[s.protocol]}</p>
                          <p className={`text-xs truncate mt-1.5 ${editSource?.id === s.id ? 'text-white/60' : 'text-gray-400'}`}>{s.url || s.localMountPath}</p>
                          {/* Progress bar for active imports */}
                          {(s.status === 'importing' || s.status === 'scanning') && s.importProgress && (
                            <div className="mt-2.5">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-medium ${editSource?.id === s.id ? 'text-white/90' : 'text-blue-700'}`}>
                                  {s.status === 'scanning' ? '扫描中...' : `${Math.round(((s.importProgress.imported + s.importProgress.skipped + s.importProgress.errors) / Math.max(s.importProgress.total, 1)) * 100)}%`}
                                </span>
                                <span className={`text-xs ${editSource?.id === s.id ? 'text-white/60' : 'text-gray-500'}`}>
                                  {s.importProgress.imported + s.importProgress.skipped + s.importProgress.errors}/{s.importProgress.total}
                                </span>
                              </div>
                              <div className={`w-full rounded-full h-2 ${editSource?.id === s.id ? 'bg-white/20' : 'bg-blue-100'}`}>
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${editSource?.id === s.id ? 'bg-white' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                                  style={{ width: `${Math.round(((s.importProgress.imported + s.importProgress.skipped + s.importProgress.errors) / Math.max(s.importProgress.total, 1)) * 100)}%` }}
                                />
                              </div>
                              <div className={`flex gap-3 mt-1.5 text-xs ${editSource?.id === s.id ? 'text-white/60' : 'text-gray-500'}`}>
                                <span>导入 {s.importProgress.imported}</span>
                                <span>跳过 {s.importProgress.skipped}</span>
                                {s.importProgress.errors > 0 && <span className="text-red-400">错误 {s.importProgress.errors}</span>}
                              </div>
                              {s.importProgress.currentFile && (
                                <div className={`mt-1.5 text-xs ${editSource?.id === s.id ? 'text-white/50' : 'text-gray-400'}`}>
                                  <p className="truncate" title={s.importProgress.currentFile}>
                                    📄 {s.importProgress.currentFile}
                                    {s.importProgress.currentFileSize && (
                                      <span className="ml-1 text-gray-400">
                                        ({(s.importProgress.currentFileSize / 1024 / 1024).toFixed(1)}MB)
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex gap-3 mt-1">
                                    {s.importProgress.currentFileIndex && (
                                      <span>进度: {s.importProgress.currentFileIndex}/{s.importProgress.total}</span>
                                    )}
                                    {s.importProgress.downloadSpeedText && (
                                      <span className="text-green-500">⬇️ {s.importProgress.downloadSpeedText}</span>
                                    )}
                                    {s.importProgress.estimatedTimeLeft && (
                                      <span>⏱️ {s.importProgress.estimatedTimeLeft}</span>
                                    )}
                                  </div>
                                  {s.importProgress.lastActivityAt && (
                                    <p className="text-gray-400 mt-0.5">
                                      最后活动: {new Date(s.importProgress.lastActivityAt).toLocaleTimeString('zh-CN')}
                                    </p>
                                  )}
                                </div>
                              )}
                              {/* File log */}
                              {s.importProgress.fileLog && s.importProgress.fileLog.length > 0 && (
                                <div className="mt-2 max-h-32 overflow-auto border rounded text-xs">
                                  <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0"><tr><th className="px-1 py-0.5 text-left">文件</th><th className="px-1 py-0.5 text-left">OE</th><th className="px-1 py-0.5 text-center">状态</th></tr></thead>
                                    <tbody>
                                      {s.importProgress.fileLog.slice(-30).map((f, i) => (
                                        <tr key={i} className={`border-t ${f.status === 'ok' ? 'bg-green-50/30' : f.status === 'fail' ? 'bg-red-50/30' : f.status === 'skip' ? 'bg-gray-50/30' : ''}`}>
                                          <td className="px-1 py-0.5 truncate max-w-[120px]" title={f.name}>{f.name}</td>
                                          <td className="px-1 py-0.5 font-mono text-blue-600">{f.oe || '-'}</td>
                                          <td className="px-1 py-0.5 text-center">{f.status === 'ok' ? '✓' : f.status === 'fail' ? '✗' : f.status === 'skip' ? '跳过' : '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {editSource?.id === s.id && (
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] pointer-events-none" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !showForm && !editSource ? (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-3">
                    <Globe size={28} className="text-violet-500" />
                  </div>
                  <p className="text-gray-600 font-medium text-sm">暂无导入源</p>
                  <p className="text-xs text-gray-400 mt-1">点击新建按钮创建</p>
                </div>
              ) : null}
            </div>

            {/* Right: Form */}
            <div className="flex-1 min-w-0">
              {(showForm || editSource) ? (
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      {editSource ? <RefreshCw size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
                    </div>
                    {editSource ? '编辑导入源' : '新建导入源'}
                  </h3>

                  {/* Row 1: Name + Protocol */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">名称</label>
                      <input
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm"
                        value={sourceForm.name}
                        onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                        placeholder="我的 NAS"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">协议</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { value: 'webdav', label: 'WebDAV', icon: '🌐' },
                          { value: 'ftp', label: 'FTP', icon: '📁' },
                          { value: 'smb_mount', label: 'SMB', icon: '💾' },
                        ].map(p => (
                          <button
                            key={p.value}
                            onClick={() => setSourceForm({ ...sourceForm, protocol: p.value })}
                            className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                              sourceForm.protocol === p.value
                                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <span>{p.icon}</span> {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Connection settings */}
                  {sourceForm.protocol !== 'smb_mount' && (
                    <div className="mb-4">
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">服务器地址</label>
                          <input
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            value={sourceForm.host}
                            onChange={(e) => setSourceForm({ ...sourceForm, host: e.target.value })}
                            placeholder={sourceForm.protocol === 'webdav' ? 'dav.example.com' : '192.168.1.100'}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">加密</label>
                          <button
                            onClick={() => setSourceForm({ ...sourceForm, ssl: !sourceForm.ssl })}
                            className={`w-full px-3 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                              sourceForm.ssl
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {sourceForm.ssl ? '🔒 HTTPS' : '🔓 HTTP'}
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">端口</label>
                          <input
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            value={sourceForm.port || ''}
                            onChange={(e) => setSourceForm({ ...sourceForm, port: e.target.value })}
                            placeholder={sourceForm.ssl ? '443' : '80'}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">路径</label>
                          <input
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            value={sourceForm.path || ''}
                            onChange={(e) => setSourceForm({ ...sourceForm, path: e.target.value })}
                            placeholder="/dav/"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">用户名</label>
                          <input
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            value={sourceForm.username}
                            onChange={(e) => setSourceForm({ ...sourceForm, username: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">密码</label>
                          <input
                            type="password"
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                            value={sourceForm.password}
                            onChange={(e) => setSourceForm({ ...sourceForm, password: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {sourceForm.protocol === 'smb_mount' && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">本地挂载路径</label>
                      <input
                        className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        value={sourceForm.local_mount_path}
                        onChange={(e) => setSourceForm({ ...sourceForm, local_mount_path: e.target.value })}
                        placeholder="/mnt/nas/images"
                      />
                    </div>
                  )}

                  {/* Row 3: Scan + Folder mapping side by side */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Scan path */}
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="block text-xs font-semibold text-gray-600 mb-2">扫描路径</label>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                          value={sourceForm.remote_path}
                          onChange={(e) => setSourceForm({ ...sourceForm, remote_path: e.target.value })}
                          placeholder="/"
                        />
                        {editSource && (
                          <button
                            onClick={() => openBrowser(editSource.id)}
                            className="px-3 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center gap-1"
                          >
                            <FolderOpen size={14} />浏览
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Auto scan interval */}
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                      <label className="block text-xs font-semibold text-gray-600 mb-2">定时扫描</label>
                      <div className="grid grid-cols-5 gap-1">
                        {[
                          { value: 0, label: '关闭' },
                          { value: 15, label: '15分' },
                          { value: 60, label: '1时' },
                          { value: 360, label: '6时' },
                          { value: 1440, label: '24时' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setSourceForm({ ...sourceForm, scan_interval: opt.value })}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              sourceForm.scan_interval === opt.value
                                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md'
                                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Folder mapping */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">文件夹自动分类映射</label>
                    {Object.keys(sourceForm.folder_mapping).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(sourceForm.folder_mapping).map(([folder, classId]) => {
                          const cls = classifications.find(c => c.id === classId);
                          return (
                            <span key={folder} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 rounded-lg text-xs border border-violet-100">
                              <Folder size={12} className="text-violet-500" />
                              {folder}
                              <ChevronRight size={12} className="text-gray-400" />
                              {cls?.name || classId}
                              <button onClick={() => removeFolderMapping(folder)} className="ml-0.5 text-violet-400 hover:text-red-500"><X size={12} /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        placeholder="文件夹名"
                        value={newMapFolder}
                        onChange={(e) => setNewMapFolder(e.target.value)}
                      />
                      <select
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        value={newMapClassId}
                        onChange={(e) => setNewMapClassId(e.target.value)}
                      >
                        <option value="">选择分类</option>
                        {classifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button
                        onClick={addFolderMapping}
                        disabled={!newMapFolder.trim() || !newMapClassId}
                        className="px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        添加
                      </button>
                    </div>
                  </div>

                  {/* Import Progress */}
                  {importing === editSource?.id && importProgress && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-800">
                          {importProgress.status === 'scanning' ? '正在扫描目录...' : '正在导入...'}
                        </span>
                        {importProgress.progress && (
                          <span className="text-sm font-mono text-blue-600">
                            {importProgress.progress.imported + importProgress.progress.skipped + importProgress.progress.errors} / {importProgress.progress.total}
                          </span>
                        )}
                      </div>
                      {importProgress.progress && importProgress.progress.total > 0 && (
                        <>
                          <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.round(((importProgress.progress.imported + importProgress.progress.skipped + importProgress.progress.errors) / importProgress.progress.total) * 100)}%` }}
                            />
                          </div>
                          <div className="flex gap-4 text-xs text-blue-700">
                            <span>已导入 <b>{importProgress.progress.imported}</b></span>
                            <span>跳过 <b>{importProgress.progress.skipped}</b></span>
                            <span>错误 <b>{importProgress.progress.errors}</b></span>
                          </div>
                          {importProgress.progress.currentFile && (
                            <p className="text-xs text-blue-500 mt-1.5 truncate">当前: {importProgress.progress.currentFile}</p>
                          )}
                          {/* File log for detail panel */}
                          {importProgress.progress.fileLog && importProgress.progress.fileLog.length > 0 && (
                            <div className="mt-3 max-h-40 overflow-auto border rounded-lg">
                              <table className="w-full text-xs">
                                <thead className="bg-blue-100 sticky top-0"><tr><th className="px-2 py-1 text-left">#</th><th className="px-2 py-1 text-left">文件</th><th className="px-2 py-1 text-left">OE号</th><th className="px-2 py-1 text-center">状态</th></tr></thead>
                                <tbody>
                                  {importProgress.progress.fileLog.map((f, i) => (
                                    <tr key={i} className={`border-t ${f.status === 'ok' ? 'bg-green-50/30' : f.status === 'fail' ? 'bg-red-50/30' : f.status === 'skip' ? 'bg-gray-50/30' : ''}`}>
                                      <td className="px-2 py-0.5 text-gray-400">{i + 1}</td>
                                      <td className="px-2 py-0.5 truncate max-w-[150px]" title={f.name}>{f.name}</td>
                                      <td className="px-2 py-0.5 font-mono text-blue-600">{f.oe || '-'}</td>
                                      <td className="px-2 py-0.5 text-center">
                                        {f.status === 'ok' && <span className="text-green-600">✓</span>}
                                        {f.status === 'fail' && <span className="text-red-600 cursor-help" title={f.error}>✗</span>}
                                        {f.status === 'skip' && <span className="text-gray-400">跳过</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {importProgress?.status === 'error' && importProgress.errorMessage && (
                    <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-100">
                      <p className="text-sm text-red-700">{importProgress.errorMessage}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {editSource && (
                        <button
                          onClick={() => handleDeleteSource(editSource.id)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5 text-sm"
                        >
                          <Trash2 size={14} />删除
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editSource && (
                        <>
                          <button
                            onClick={() => handleTestSource(editSource.id)}
                            disabled={testing === editSource.id}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {testing === editSource.id ? <><Loader2 size={14} className="animate-spin" />测试中</> : <><Wifi size={14} />测试连接</>}
                          </button>
                          <button
                            onClick={() => startImport(editSource.id)}
                            disabled={importing === editSource.id || (editSource.status !== 'idle' && editSource.status !== 'error')}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {importing === editSource.id ? <><Loader2 size={14} className="animate-spin" />导入中</> : <><Play size={14} />开始导入</>}
                          </button>
                          {(editSource.status === 'importing' || editSource.status === 'scanning') && (
                            <button
                              onClick={() => stopImport(editSource.id)}
                              className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center gap-1.5"
                            >
                              停止导入
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => { setShowForm(false); setEditSource(null); }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveSource}
                        disabled={!sourceForm.name.trim()}
                        className="px-5 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editSource ? '保存修改' : '创建导入源'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[300px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-3">
                      <Plus size={28} className="text-violet-500" />
                    </div>
                    <p className="text-gray-500 text-sm">选择左侧导入源进行编辑，或新建导入源</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Directory Browser Modal */}
      <Modal isOpen={showBrowser} onClose={() => setShowBrowser(false)} title="浏览远程目录" size="lg">
        <div className="space-y-4">
          {/* Current path breadcrumb */}
          <div className="flex items-center gap-1 text-sm bg-gray-100 p-2 rounded-lg overflow-x-auto">
            <button
              className="p-1 hover:bg-gray-200 rounded"
              onClick={() => navigateToFolder('/')}
              title="根目录"
            >
              <Home size={16} />
            </button>
            {currentPath.split('/').filter(Boolean).map((segment, i, arr) => (
              <div key={i} className="flex items-center">
                <ChevronRight size={14} className="text-gray-400" />
                <button
                  className="px-2 py-1 hover:bg-gray-200 rounded text-gray-700"
                  onClick={() => navigateToFolder('/' + arr.slice(0, i + 1).join('/'))}
                >
                  {segment}
                </button>
              </div>
            ))}
          </div>

          {/* Directory listing */}
          <div className="border border-gray-200 rounded-lg max-h-[50vh] overflow-y-auto">
            {loadingDir ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            ) : dirItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                空目录
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {dirItems.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                      selectedPath === item.path ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (item.isDirectory) {
                        navigateToFolder(item.path);
                      } else {
                        setSelectedPath(item.path);
                      }
                    }}
                  >
                    {item.isDirectory ? (
                      <>
                        <Folder size={18} className="text-yellow-500 mr-3 flex-shrink-0" />
                        <span className="flex-1 text-sm truncate">{item.name}</span>
                        <ChevronRight size={14} className="text-gray-400 ml-2" />
                      </>
                    ) : (
                      <>
                        <File size={18} className="text-gray-400 mr-3 flex-shrink-0" />
                        <span className="flex-1 text-sm truncate text-gray-600">{item.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{formatSize(item.size)}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected path display */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">当前选中路径:</p>
            <p className="text-sm font-mono break-all">{currentPath}</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="secondary" onClick={() => setShowBrowser(false)}>取消</Button>
            <Button onClick={selectCurrentPath}>使用此路径</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
