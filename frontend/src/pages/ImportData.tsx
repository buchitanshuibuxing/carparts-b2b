import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, FileDown, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

import { useToast } from '@/components/ui/Toast';
const IMPORT_TYPES = [
  { value: 'parts', label: '配件数据' },
  { value: 'inventory', label: '库存数据' },
  { value: 'suppliers', label: '供应商数据' },
  { value: 'customers', label: '客户数据' },
  { value: 'prices', label: '价格数据' },
];

const EXPORT_TYPES = [
  ...IMPORT_TYPES,
  { value: 'orders', label: '订单数据' },
];

const TEMPLATE_TYPES = [
  { value: 'parts', label: '配件导入模板', columns: 'OE编号、中文名称、英文名称、分类、品牌、车型、发动机类型、年份、规格、单位、重量、备注' },
  { value: 'inventory', label: '库存导入模板', columns: 'OE编号、数量、仓库位置、仓库区域、最低库存、最高库存、备注' },
  { value: 'suppliers', label: '供应商导入模板', columns: '供应商编号、公司名称、联系人、电话、邮箱、国家、地址、主营产品、付款条件、交期、货币、评级、备注' },
  { value: 'customers', label: '客户导入模板', columns: '客户编号、公司名称、联系人、电话、邮箱、国家、地区、客户类型、客户等级、货币、信用额度、付款条件、备注' },
  { value: 'prices', label: '价格导入模板', columns: 'OE编号、价格类型、货币、单价、最小数量、最大数量、生效日期、失效日期、备注' },
];

const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  parts: {
    'OE编号': 'oeNumber', 'OE Number': 'oeNumber', 'oe_number': 'oeNumber',
    '中文名称': 'partNameCn', 'Part Name CN': 'partNameCn', 'part_name_cn': 'partNameCn',
    '英文名称': 'partNameEn', 'Part Name EN': 'partNameEn', 'part_name_en': 'partNameEn',
    '分类': 'category', 'Category': 'category',
    '品牌': 'brand', 'Brand': 'brand',
    '车型': 'carModel', 'Car Model': 'carModel', 'car_model': 'carModel',
    '发动机类型': 'engineType', 'Engine Type': 'engineType', 'engine_type': 'engineType',
    '年份从': 'modelYearFrom', 'Year From': 'modelYearFrom',
    '年份到': 'modelYearTo', 'Year To': 'modelYearTo',
    '规格': 'specifications', 'Specifications': 'specifications',
    '单位': 'unit', 'Unit': 'unit',
    '重量(kg)': 'weightKg', 'Weight': 'weightKg',
    '备注': 'notes', 'Notes': 'notes',
  },
  inventory: {
    'OE编号': 'oeNumber', 'OE Number': 'oeNumber', 'oe_number': 'oeNumber',
    '数量': 'quantity', 'Quantity': 'quantity',
    '仓库位置': 'warehouseLocation', 'Warehouse Location': 'warehouseLocation',
    '仓库区域': 'warehouseZone', 'Warehouse Zone': 'warehouseZone',
    '最低库存': 'minStock', 'Min Stock': 'minStock',
    '最高库存': 'maxStock', 'Max Stock': 'maxStock',
    '备注': 'notes', 'Notes': 'notes',
  },
  suppliers: {
    '供应商编号': 'supplierCode', 'Supplier Code': 'supplierCode', 'supplier_code': 'supplierCode',
    '公司名称': 'companyName', 'Company Name': 'companyName', 'company_name': 'companyName',
    '联系人': 'contactPerson', 'Contact': 'contactPerson',
    '电话': 'phone', 'Phone': 'phone',
    '邮箱': 'email', 'Email': 'email',
    '国家': 'country', 'Country': 'country',
    '地址': 'address', 'Address': 'address',
    '主营产品': 'mainProducts', 'Main Products': 'mainProducts', 'main_products': 'mainProducts',
    '付款条件': 'paymentTerms', 'Payment Terms': 'paymentTerms',
    '交期(天)': 'leadTimeDays', 'Lead Time': 'leadTimeDays',
    '货币': 'currency', 'Currency': 'currency',
    '评级': 'rating', 'Rating': 'rating',
    '备注': 'notes', 'Notes': 'notes',
  },
  customers: {
    '客户编号': 'customerCode', 'Customer Code': 'customerCode', 'customer_code': 'customerCode',
    '公司名称': 'companyName', 'Company Name': 'companyName', 'company_name': 'companyName',
    '联系人': 'contactPerson', 'Contact': 'contactPerson',
    '电话': 'phone', 'Phone': 'phone',
    '邮箱': 'email', 'Email': 'email',
    '国家': 'country', 'Country': 'country',
    '地区': 'region', 'Region': 'region',
    '客户类型': 'customerType', 'Customer Type': 'customerType', 'customer_type': 'customerType',
    '客户等级': 'customerLevel', 'Customer Level': 'customerLevel', 'customer_level': 'customerLevel',
    '货币': 'currency', 'Currency': 'currency',
    '信用额度': 'creditLimit', 'Credit Limit': 'creditLimit',
    '付款条件': 'paymentTerms', 'Payment Terms': 'paymentTerms',
    '备注': 'notes', 'Notes': 'notes',
  },
  prices: {
    'OE编号': 'oeNumber', 'OE Number': 'oeNumber', 'oe_number': 'oeNumber',
    '价格类型': 'priceType', 'Price Type': 'priceType', 'price_type': 'priceType',
    '货币': 'currency', 'Currency': 'currency',
    '单价': 'unitPrice', 'Unit Price': 'unitPrice', 'unit_price': 'unitPrice',
    '最小数量': 'minQuantity', 'Min Qty': 'minQuantity', 'min_quantity': 'minQuantity',
    '最大数量': 'maxQuantity', 'Max Qty': 'maxQuantity', 'max_quantity': 'maxQuantity',
    '生效日期': 'effectiveDate', 'Effective Date': 'effectiveDate',
    '失效日期': 'expiryDate', 'Expiry Date': 'expiryDate',
    '备注': 'notes', 'Notes': 'notes',
  },
};

interface ImportProgress {
  active: boolean;
  total: number;
  current: number;
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
  done: boolean;
}

interface PreviewResult {
  total_rows: number;
  unique_ids: number;
  duplicate_count: number;
  duplicates: string[];
  file_duplicate_count: number;
  file_duplicates: string[];
}

interface ExportResult {
  success: boolean;
  type: string;
}

export default function ImportData() {
  const { success, error, warning } = useToast();
  const [importType, setImportType] = useState('parts');
  const [file, setFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  // Duplicate detection
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Import progress
  const [progress, setProgress] = useState<ImportProgress>({ active: false, total: 0, current: 0, success: 0, skipped: 0, failed: 0, errors: [], done: false });
  const cancelRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeLabel = (v: string) => IMPORT_TYPES.find(t => t.value === v)?.label || v;

  const parseRows = (file: File): Promise<Record<string, any>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          let rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

          // For prices: detect merged header template
          if (importType === 'prices') {
            const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            if (rawRows.length >= 2) {
              const subHeaderRow = rawRows[1];
              const hasSubHeaders = subHeaderRow && subHeaderRow.some((h: any) => h === '单价' || h === '最小数量' || h === '最大数量');
              if (hasSubHeaders) {
                const headerRow = rawRows[0];
                const mergedHeaders: string[] = [];
                let currentPrefix = '';
                for (let c = 0; c < subHeaderRow.length; c++) {
                  const h = headerRow[c];
                  if (h && String(h).trim() !== '') currentPrefix = String(h);
                  const sub = subHeaderRow[c];
                  if (sub && String(sub).trim() !== '') {
                    mergedHeaders.push(currentPrefix ? `${currentPrefix}-${sub}` : String(sub));
                  } else {
                    mergedHeaders.push(currentPrefix || `col_${c}`);
                  }
                }
                rows = rawRows.slice(2).map(row => {
                  const obj: Record<string, any> = {};
                  for (let c = 0; c < mergedHeaders.length; c++) {
                    obj[mergedHeaders[c]] = row[c];
                  }
                  return obj;
                });
              }
            }
          }

          const mapping = FIELD_MAPPINGS[importType] || {};
          const mapped = rows.map(row => {
            const entity: Record<string, any> = {};
            for (const [src, dest] of Object.entries(mapping)) {
              if (row[src] !== undefined) entity[dest] = String(row[src]).trim();
            }
            // For prices new format: pass through raw columns too
            if (importType === 'prices') {
              for (const [key, val] of Object.entries(row)) {
                if (key.includes('-') && val !== undefined && val !== null) {
                  entity[key] = typeof val === 'string' ? val.trim() : val;
                }
              }
              if (row['货币'] !== undefined) entity['货币'] = String(row['货币']).trim();
            }
            return entity;
          });
          resolve(mapped);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  const BATCH_SIZE = 20;
  const CONCURRENCY = 5;

  const startImport = async (rows: Record<string, any>[], strategy?: 'overwrite' | 'skip') => {
    cancelRef.current = false;
    setProgress({ active: true, total: rows.length, current: 0, success: 0, skipped: 0, failed: 0, errors: [], done: false });
    setShowDuplicateModal(false);

    let success = 0, skipped = 0, failed = 0, processed = 0;
    const errors: string[] = [];

    // Split rows into batches
    const batches: { rows: Record<string, any>[]; offset: number }[] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push({ rows: rows.slice(i, i + BATCH_SIZE), offset: i });
    }

    let batchIdx = 0;
    const runNext = async () => {
      while (batchIdx < batches.length) {
        if (cancelRef.current) return;
        const batch = batches[batchIdx++];
        try {
          const { data } = await api.post('/import/batch', {
            import_type: importType,
            rows: batch.rows,
            duplicate_strategy: strategy,
          });
          success += data.success;
          skipped += data.skipped;
          failed += data.failed;
          errors.push(...data.errors);
        } catch (err: any) {
          failed += batch.rows.length;
          errors.push(`第 ${batch.offset + 1}-${batch.offset + batch.rows.length} 行: ${err.response?.data?.message || err.message}`);
        }
        processed += batch.rows.length;
        setProgress({ active: true, total: rows.length, current: Math.min(processed, rows.length), success, skipped, failed, errors: [...errors], done: false });
      }
    };

    // Run CONCURRENCY workers in parallel
    await Promise.all(Array.from({ length: CONCURRENCY }, () => runNext()));

    if (cancelRef.current) errors.push(`用户取消，已处理 ${processed}/${rows.length} 行`);
    setProgress({ active: true, total: rows.length, current: rows.length, success, skipped, failed, errors, done: true });
  };

  const KEY_FIELD: Record<string, string> = { parts: 'oeNumber', inventory: 'oeNumber', suppliers: 'supplierCode', customers: 'customerCode', prices: 'oeNumber' };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setPreviewing(true);
    setPreview(null);
    setShowErrors(false);

    // Parse rows first for file-internal duplicate check
    const rows = await parseRows(file);
    const key = KEY_FIELD[importType] || 'oeNumber';

    // Detect duplicates within the file
    const seen = new Map<string, number>();
    const fileDuplicates: string[] = [];
    for (const row of rows) {
      const id = row[key];
      if (!id) continue;
      if (seen.has(id)) {
        if (seen.get(id) === 1) fileDuplicates.push(id);
        seen.set(id, seen.get(id)! + 1);
      } else {
        seen.set(id, 1);
      }
    }

    // Check database for duplicates
    let dbResult: any = null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('import_type', importType);
      const { data } = await api.post(`/import/preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      dbResult = data;
    } catch {
      // Preview failed, proceed without DB duplicate check
    }

    const combined: PreviewResult = {
      total_rows: rows.length,
      unique_ids: dbResult?.unique_ids ?? seen.size,
      duplicate_count: dbResult?.duplicate_count ?? 0,
      duplicates: dbResult?.duplicates ?? [],
      file_duplicate_count: fileDuplicates.length,
      file_duplicates: fileDuplicates,
    };
    setPreview(combined);

    if (combined.duplicate_count > 0 || combined.file_duplicate_count > 0) {
      setShowDuplicateModal(true);
      setPreviewing(false);
      return;
    }

    setPreviewing(false);
    await startImport(rows);
  };

  const handleDuplicateChoice = async (strategy: 'overwrite' | 'skip') => {
    if (!file) return;
    let rows = await parseRows(file);
    const key = KEY_FIELD[importType] || 'oeNumber';
    // Deduplicate within file: keep first occurrence
    const seen = new Set<string>();
    rows = rows.filter(row => {
      const id = row[key];
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    await startImport(rows, strategy);
  };

  const handleCancelImport = () => {
    cancelRef.current = true;
  };

  const resetAll = () => {
    setProgress({ active: false, total: 0, current: 0, success: 0, skipped: 0, failed: 0, errors: [], done: false });
    setPreview(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = async (type: string) => {
    setDownloadingTemplate(type);
    try {
      const { data } = await api.get(`/import/template`, { params: { type }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch { success('模板下载失败'); }
    finally { setDownloadingTemplate(''); }
  };

  const handleExport = async (type: string) => {
    setExporting(type);
    setExportResult(null);
    try {
      const { data } = await api.get(`/import/export`, { params: { type }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExportResult({ success: true, type });
    } catch { setExportResult({ success: false, type }); }
    finally { setExporting(''); }
  };

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">数据导入导出</h1>

      {/* Templates */}
      <Card>
        <Card.Header>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileDown className="h-5 w-5" /> 导入模板下载
          </h2>
          <p className="text-sm text-gray-500 mt-1">下载模板后按格式填写数据，再进行导入</p>
        </Card.Header>
        <Card.Body>
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATE_TYPES.map((t) => (
              <div key={t.value} className="rounded-lg border p-4 hover:border-blue-300 transition">
                <p className="font-medium text-sm mb-1">{t.label}</p>
                <p className="text-xs text-gray-500 mb-3">包含字段：{t.columns}</p>
                <Button variant="secondary" className="w-full text-sm" onClick={() => handleDownloadTemplate(t.value)} disabled={downloadingTemplate === t.value}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {downloadingTemplate === t.value ? '下载中...' : '下载模板'}
                </Button>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import */}
        <Card>
          <Card.Header>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Upload className="h-5 w-5" /> 导入数据
            </h2>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleImport} className="space-y-4">
              <Select label="数据类型" value={importType} onChange={(e) => setImportType(e.target.value)} options={IMPORT_TYPES} />
              <div>
                <label className="mb-1 block text-sm font-medium">选择文件</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center hover:border-blue-400">
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{file ? file.name : '点击选择 Excel/CSV 文件'}</p>
                    <p className="text-xs text-gray-500">支持 .xlsx, .xls, .csv</p>
                  </div>
                </label>
              </div>
              <Button type="submit" disabled={!file || previewing} className="w-full">
                {previewing ? '检查重复中...' : '开始导入'}
              </Button>
            </form>
          </Card.Body>
        </Card>

        {/* Export */}
        <Card>
          <Card.Header>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Download className="h-5 w-5" /> 导出数据
            </h2>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {EXPORT_TYPES.map((t) => (
                <Button key={t.value} variant="secondary" className="w-full justify-start" onClick={() => handleExport(t.value)} disabled={!!exporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {exporting === t.value ? `正在导出${t.label}...` : `导出${t.label}`}
                </Button>
              ))}
              {exportResult && (
                <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${exportResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {exportResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {exportResult.success ? `${typeLabel(exportResult.type)}导出成功，文件已下载` : `${typeLabel(exportResult.type)}导出失败`}
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Import Progress Modal */}
      {progress.active && (
        <div className="fixed inset-0 z-[9998] bg-black/50" />
      )}
      {progress.active && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">{progress.done ? '导入完成' : '导入中'}</h3>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>进度</span>
                <span>{progress.current}/{progress.total} ({percent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${progress.done && progress.failed === 0 ? 'bg-green-500' : progress.done ? 'bg-yellow-500' : 'bg-blue-500'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold">{progress.total}</p>
                <p className="text-[10px] text-gray-500">总计</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-lg font-bold text-green-600">{progress.success}</p>
                <p className="text-[10px] text-gray-500">成功</p>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <p className="text-lg font-bold text-orange-500">{progress.skipped}</p>
                <p className="text-[10px] text-gray-500">跳过</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <p className="text-lg font-bold text-red-600">{progress.failed}</p>
                <p className="text-[10px] text-gray-500">失败</p>
              </div>
            </div>

            {/* Current item indicator */}
            {!progress.done && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在处理第 {progress.current + 1} 行...
              </div>
            )}

            {/* Errors */}
            {progress.errors.length > 0 && (
              <div className="mb-4">
                <button onClick={() => setShowErrors(!showErrors)} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
                  {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  查看错误 ({progress.errors.length})
                </button>
                {showErrors && (
                  <ul className="mt-2 space-y-1 max-h-32 overflow-auto">
                    {progress.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!progress.done ? (
                <Button variant="secondary" className="w-full" onClick={handleCancelImport}>取消导入</Button>
              ) : (
                <Button className="w-full" onClick={resetAll}>完成</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Detection Modal */}
      <Modal isOpen={showDuplicateModal} onClose={() => { setShowDuplicateModal(false); setPreview(null); }} title="检测到重复数据" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium">发现重复记录</p>
              <p className="text-sm text-gray-500">请选择处理方式</p>
            </div>
          </div>

          {preview && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold">{preview.total_rows}</p>
                <p className="text-xs text-gray-500">总行数</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold">{preview.unique_ids}</p>
                <p className="text-xs text-gray-500">唯一记录</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xl font-bold text-yellow-700">{preview.duplicate_count + preview.file_duplicate_count}</p>
                <p className="text-xs text-yellow-600">重复记录</p>
              </div>
            </div>
          )}

          {preview && preview.file_duplicate_count > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-sm font-medium text-red-700 mb-1">文件内重复 ({preview.file_duplicate_count} 条)</p>
              <p className="text-xs text-red-600 mb-2">以下编号在 Excel 中出现多次，将只导入第一条</p>
              <div className="flex flex-wrap gap-1">
                {preview.file_duplicates.slice(0, 20).map((d, i) => (
                  <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{d}</span>
                ))}
                {preview.file_duplicates.length > 20 && (
                  <span className="text-xs text-gray-400">...等 {preview.file_duplicates.length} 条</span>
                )}
              </div>
            </div>
          )}

          {preview && preview.duplicate_count > 0 && (
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <p className="text-sm font-medium text-yellow-700 mb-1">与数据库重复 ({preview.duplicate_count} 条)</p>
              <p className="text-xs text-yellow-600 mb-2">以下编号已存在于数据库中</p>
              <div className="flex flex-wrap gap-1">
                {preview.duplicates.slice(0, 20).map((d, i) => (
                  <span key={i} className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">{d}</span>
                ))}
                {preview.duplicates.length > 20 && (
                  <span className="text-xs text-gray-400">...等 {preview.duplicates.length} 条</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => handleDuplicateChoice('skip')}>跳过重复</Button>
            <Button className="flex-1" onClick={() => handleDuplicateChoice('overwrite')}>覆盖更新</Button>
          </div>
          <button type="button" onClick={() => { setShowDuplicateModal(false); setPreview(null); }} className="w-full text-sm text-gray-500 hover:text-gray-700">
            取消导入
          </button>
        </div>
      </Modal>
    </div>
  );
}
