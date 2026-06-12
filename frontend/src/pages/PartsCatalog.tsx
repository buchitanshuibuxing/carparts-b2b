import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X, Languages, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import api from '@/lib/api';
import type { Part } from '@/types/part';
import type { PaginatedResponse } from '@/types/api';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
interface PartClassification { id: number; name: string; description?: string; }

// Standalone classification manager component to avoid cursor issues
function PartsClassificationManager({ classifications, onClose, onRefresh }: {
  classifications: PartClassification[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [newClassName, setNewClassName] = useState('');

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    try {
      await api.post('/parts/classifications', { name: newClassName });
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
      await api.delete(`/parts/classifications/${id}`);
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
            className="flex-1 px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-lg text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150"
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

// Standalone create part modal to avoid cursor issues
function CreatePartModal({ classifications, onClose, onSuccess }: {
  classifications: PartClassification[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { success, error } = useToast();
  const [form, setForm] = useState({ oe_number: '', part_name_cn: '', classification_id: '', brand: '', car_model: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.oe_number.trim() || !form.part_name_cn.trim()) {
      error('请填写OE编号和中文名称');
      return;
    }
    setSaving(true);
    try {
      await api.post('/parts', {
        oe_number: form.oe_number,
        part_name_cn: form.part_name_cn,
        classification_id: form.classification_id ? Number(form.classification_id) : undefined,
        brand: form.brand,
        car_model: form.car_model,
      });
      success('配件创建成功');
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="新建配件" size="lg">
      <div className="space-y-4">
        <Input label="OE 编号 *" value={form.oe_number} onChange={(e) => setForm({ ...form, oe_number: e.target.value })} />
        <Input label="中文名称 *" value={form.part_name_cn} onChange={(e) => setForm({ ...form, part_name_cn: e.target.value })} />
        <div>
          <label className="mb-1 block text-sm font-medium">分类</label>
          <select value={form.classification_id} onChange={(e) => setForm({ ...form, classification_id: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">选择分类</option>
            {classifications.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label="品牌" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <Input label="车型" value={form.car_model} onChange={(e) => setForm({ ...form, car_model: e.target.value })} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? '创建中...' : '创建'}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function PartsCatalog() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<Part>>({ items: [], total: 0, page: 1, page_size: 100, total_pages: 0 });
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [classId, setClassId] = useState('');
  const [brand, setBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [partType, setPartType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [classifications, setClassifications] = useState<PartClassification[]>([]);
  const [showClassManager, setShowClassManager] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Batch translate
  const [translating, setTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<{ total: number; translated: number; failed: number; errors: string[] } | null>(null);

  // Batch edit
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState({ classification_id: '', brand: '', part_type: '' });

  // Batch delete
  const [showBatchDelete, setShowBatchDelete] = useState(false);

  // Batch progress (shared by edit/delete)
  const [batchProgress, setBatchProgress] = useState<{ active: boolean; title: string; total: number; current: number; success: number; failed: number; done: boolean }>({ active: false, title: '', total: 0, current: 0, success: 0, failed: 0, done: false });

  const fetchParts = async () => {
    const params: any = { page, page_size: 100 };
    if (keyword) params.keyword = keyword;
    if (classId) params.classification_id = classId;
    if (brand) params.brand = brand;
    if (carModel) params.car_model = carModel;
    if (partType) params.part_type = partType;
    if (isActive) params.is_active = isActive;
    const { data: res } = await api.get('/parts', { params });
    setData(res.data || res);
  };

  const fetchClassifications = async () => {
    try {
      const { data: res } = await api.get('/parts/classifications');
      setClassifications(res.data || res || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchParts(); }, [page, keyword, classId, brand, carModel, partType, isActive]);
  useEffect(() => { fetchClassifications(); }, []);

  const hasFilters = classId || brand || carModel || partType || isActive;
  const clearFilters = () => { setClassId(''); setBrand(''); setCarModel(''); setPartType(''); setIsActive(''); setPage(1); };

  // Selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (data.items.length > 0 && data.items.every(item => selectedIds.has(item.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.items.map(item => item.id)));
    }
  };

  // Batch translate
  const handleBatchTranslate = async () => {
    setTranslating(true);
    setTranslateResult(null);
    try {
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const { data } = await api.post('/parts/batch-translate', { ids });
      setTranslateResult(data);
      fetchParts();
    } catch (err: any) {
      setTranslateResult({ total: 0, translated: 0, failed: 0, errors: [err.response?.data?.message || err.message] });
    } finally {
      setTranslating(false);
    }
  };

  // Batch edit
  const handleBatchEdit = async () => {
    const payload: any = {};
    if (batchEditForm.classification_id) payload.classification_id = Number(batchEditForm.classification_id);
    if (batchEditForm.brand) payload.brand = batchEditForm.brand;
    if (batchEditForm.part_type) payload.part_type = batchEditForm.part_type;
    if (Object.keys(payload).length === 0) { warning('请至少填写一个字段'); return; }

    const ids = Array.from(selectedIds);
    setShowBatchEdit(false);
    setBatchProgress({ active: true, title: '批量编辑', total: ids.length, current: 0, success: 0, failed: 0, done: false });
    let successCount = 0, failedCount = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        await api.put(`/parts/${ids[i]}`, payload);
        successCount++;
      } catch {
        failedCount++;
      }
      setBatchProgress({ active: true, title: '批量编辑', total: ids.length, current: i + 1, success: successCount, failed: failedCount, done: i + 1 === ids.length });
    }
    setSelectedIds(new Set());
    setBatchEditForm({ classification_id: '', brand: '', part_type: '' });
    fetchParts();
  };

  // Batch delete
  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    setShowBatchDelete(false);
    setBatchProgress({ active: true, title: '批量删除', total: ids.length, current: 0, success: 0, failed: 0, done: false });
    try {
      const { data: res } = await api.post('/parts/batch-delete', { ids });
      setBatchProgress({ active: true, title: '批量删除', total: ids.length, current: ids.length, success: res.deleted || ids.length, failed: 0, done: true });
    } catch {
      setBatchProgress({ active: true, title: '批量删除', total: ids.length, current: ids.length, success: 0, failed: ids.length, done: true });
    }
    setSelectedIds(new Set());
    fetchParts();
  };

  const columns = [
    { key: 'oeNumber', title: 'OE 编号', render: (p: Part) => <span className="font-mono text-blue-600">{p.oeNumber}</span> },
    { key: 'partNameCn', title: '中文名称' },
    { key: 'partNameEn', title: '英文名称', render: (p: Part) => <span className={p.partNameEn ? '' : 'text-gray-400'}>{p.partNameEn || '-'}</span> },
    { key: 'brand', title: '品牌' },
    { key: 'classification', title: '分类', render: (p: Part) => <Badge>{p.classification?.name || p.category || '-'}</Badge> },
    { key: 'partType', title: '配件类型' },
    { key: 'carModel', title: '车型' },
    { key: 'inventory', title: '库存', render: (p: Part) => p.inventory?.quantity ?? 0 },
    { key: 'isActive', title: '状态', render: (p: Part) => <Badge color={p.isActive ? 'green' : 'red'}>{p.isActive ? '启用' : '停用'}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">配件目录</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowClassManager(true)}>分类管理</Button>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" />新建配件</Button>
        </div>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-700">已选 {selectedIds.size} 项</span>
          <Button variant="secondary" className="text-sm h-8" onClick={handleBatchTranslate} disabled={translating}>
            <Languages className="mr-1 h-4 w-4" />
            {translating ? '翻译中...' : '一键匹配英文'}
          </Button>
          <Button variant="secondary" className="text-sm h-8" onClick={() => setShowBatchEdit(true)}>
            <Edit className="mr-1 h-4 w-4" /> 批量编辑
          </Button>
          <Button variant="secondary" className="text-sm h-8 text-red-600 hover:text-red-700" onClick={() => setShowBatchDelete(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> 批量删除
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700 ml-2">
            取消选择
          </button>
        </div>
      )}

      {/* Translate result */}
      {translateResult && (
        <div className={`rounded-xl p-3 text-sm ${translateResult.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          翻译完成：共 {translateResult.total} 条，成功 {translateResult.translated} 条，失败 {translateResult.failed} 条
          {translateResult.errors.length > 0 && (
            <button onClick={() => setTranslateResult(null)} className="ml-2 underline">关闭</button>
          )}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input className="w-full pl-10 pr-4 py-2 border border-gray-200 bg-gray-50/50 rounded-lg text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" placeholder="搜索 OE 编号或名称..." value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
        </div>
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} className="border border-gray-200 bg-gray-50/50 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150">
          <option value="">全部分类</option>
          {classifications.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} placeholder="品牌" className="border border-gray-200 bg-gray-50/50 rounded-lg px-3 py-2 text-sm w-28 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" />
        <input value={carModel} onChange={(e) => { setCarModel(e.target.value); setPage(1); }} placeholder="车型" className="border border-gray-200 bg-gray-50/50 rounded-lg px-3 py-2 text-sm w-28 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" />
        <input value={partType} onChange={(e) => { setPartType(e.target.value); setPage(1); }} placeholder="配件类型" className="border border-gray-200 bg-gray-50/50 rounded-lg px-3 py-2 text-sm w-28 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" />
        <select value={isActive} onChange={(e) => { setIsActive(e.target.value); setPage(1); }} className="border border-gray-200 bg-gray-50/50 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150">
          <option value="">全部状态</option>
          <option value="true">启用</option>
          <option value="false">停用</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-2 text-sm text-gray-500 hover:text-gray-700">
            <X size={14} /> 清除筛选
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <Table
          columns={columns}
          data={data.items}
          keyField="id"
          onRowClick={(p) => navigate(`/parts/${p.id}`)}
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
        />
        <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreatePartModal
          classifications={classifications}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchParts}
        />
      )}

      {/* Batch edit modal */}
      <Modal isOpen={showBatchEdit} onClose={() => { setShowBatchEdit(false); setBatchEditForm({ classification_id: '', brand: '', part_type: '' }); }} title="批量编辑" size="md">
        <div className="space-y-5">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">{selectedIds.size}</div>
            <div>
              <p className="text-sm font-medium text-gray-900">已选择 {selectedIds.size} 条配件</p>
              <p className="text-xs text-gray-500">留空的字段不会被修改</p>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">分类</label>
            <select value={batchEditForm.classification_id} onChange={(e) => setBatchEditForm({ ...batchEditForm, classification_id: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="">不修改</option>
              {classifications.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Input label="品牌" value={batchEditForm.brand} onChange={(e) => setBatchEditForm({ ...batchEditForm, brand: e.target.value })} placeholder="留空不修改" />
          <Input label="配件类型" value={batchEditForm.part_type} onChange={(e) => setBatchEditForm({ ...batchEditForm, part_type: e.target.value })} placeholder="留空不修改" />
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => { setShowBatchEdit(false); setBatchEditForm({ classification_id: '', brand: '', part_type: '' }); }} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
            <button onClick={handleBatchEdit} className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">确认修改</button>
          </div>
        </div>
      </Modal>

      {/* Batch delete confirmation */}
      <Modal isOpen={showBatchDelete} onClose={() => setShowBatchDelete(false)} title="确认删除" size="sm">
        <div className="space-y-4">
          <p>确定要删除选中的 <strong>{selectedIds.size}</strong> 条配件吗？此操作不可撤销。</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowBatchDelete(false)}>取消</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleBatchDelete}>
              确认删除
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Progress Modal */}
      <Modal isOpen={batchProgress.active} onClose={() => { if (batchProgress.done) setBatchProgress(p => ({ ...p, active: false })); }} title={batchProgress.title} size="sm">
        <div className="space-y-5">
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
          <p className="text-center text-sm text-gray-500">
            共 {batchProgress.total} 条配件
          </p>
          {batchProgress.done && (
            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setBatchProgress(p => ({ ...p, active: false }))} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                完成
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Classification Manager */}
      {showClassManager && (
        <PartsClassificationManager
          classifications={classifications}
          onClose={() => setShowClassManager(false)}
          onRefresh={fetchClassifications}
        />
      )}

      {/* Translate progress overlay */}
      {translating && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/50" />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-lg font-semibold">AI 翻译中</p>
              <p className="text-sm text-gray-500 mt-1">正在为 {selectedIds.size > 0 ? selectedIds.size : '所有缺少英文名的'} 条配件匹配英文名称...</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
