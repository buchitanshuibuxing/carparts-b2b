import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Pencil, Search, Settings, History, RefreshCw, Check, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PartPicker, type PartOption } from '@/components/ui/PartPicker';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
// Standalone create price modal to avoid cursor issues
function CreatePriceModal({ priceTypes, currencies, onClose, onSuccess }: {
  priceTypes: string[];
  currencies: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { success, error } = useToast();
  const [selectedPart, setSelectedPart] = useState<PartOption | null>(null);
  const [form, setForm] = useState({ price_type: '批发价', unit_price: '', currency: 'CNY', min_quantity: '1', max_quantity: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return success('请选择配件');
    setSaving(true);
    try {
      await api.post('/prices/set', {
        part_id: selectedPart.id, price_type: form.price_type,
        unit_price: Number(form.unit_price), currency: form.currency,
        min_quantity: Number(form.min_quantity), max_quantity: form.max_quantity ? Number(form.max_quantity) : 99999,
      });
      onSuccess();
      onClose();
    } catch (err: any) { error(err.response?.data?.message || '创建失败'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="设置价格" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">选择配件 *</label>
          <PartPicker value={selectedPart} onSelect={setSelectedPart} />
        </div>
        <Select label="价格类型" value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value })} options={priceTypes.map(t => ({ value: t, label: t }))} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="单价" type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} required />
          <Select label="货币" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} options={currencies.map(c => ({ value: c, label: c }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="最小数量" type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} />
          <Input label="最大数量" type="number" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>取消</Button><Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</Button></div>
      </form>
    </Modal>
  );
}

// Separate form component to avoid re-render issues
function TypeConfigForm({ initialTypes, initialCurrencies, onSave, onCancel }: {
  initialTypes: string;
  initialCurrencies: string;
  onSave: (types: string[], currencies: string[]) => void;
  onCancel: () => void;
}) {
  const [types, setTypes] = useState(initialTypes);
  const [currencies, setCurrencies] = useState(initialCurrencies);
  const [newType, setNewType] = useState('');
  const [newCurrency, setNewCurrency] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">价格类型</h3>
        <p className="text-xs text-gray-400 mb-2">每行一个类型</p>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          rows={5} value={types} onChange={(e) => setTypes(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <input placeholder="新增类型" value={newType} onChange={(e) => setNewType(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            onKeyDown={(e) => { if (e.key === 'Enter' && newType.trim()) { setTypes(types ? types + '\n' + newType.trim() : newType.trim()); setNewType(''); } }}
          />
          <Button variant="secondary" onClick={() => { if (newType.trim()) { setTypes(types ? types + '\n' + newType.trim() : newType.trim()); setNewType(''); } }}>添加</Button>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">货币</h3>
        <p className="text-xs text-gray-400 mb-2">每行一个货币代码</p>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          rows={4} value={currencies} onChange={(e) => setCurrencies(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <input placeholder="新增货币" value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            onKeyDown={(e) => { if (e.key === 'Enter' && newCurrency.trim()) { setCurrencies(currencies ? currencies + '\n' + newCurrency.trim() : newCurrency.trim()); setNewCurrency(''); } }}
          />
          <Button variant="secondary" onClick={() => { if (newCurrency.trim()) { setCurrencies(currencies ? currencies + '\n' + newCurrency.trim() : newCurrency.trim()); setNewCurrency(''); } }}>添加</Button>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button onClick={() => {
          const t = types.split('\n').map(s => s.trim()).filter(Boolean);
          const c = currencies.split('\n').map(s => s.trim()).filter(Boolean);
          onSave(t, c);
        }}>保存</Button>
      </div>
    </div>
  );
}

interface PriceItem {
  id: number;
  partId: number;
  priceType: string;
  unitPrice: number;
  currency: string;
  minQuantity: number;
  maxQuantity: number;
  effectiveDate: string;
  expiryDate?: string;
  notes: string;
  part?: { id: number; oeNumber: string; partNameCn: string; brand: string } | null;
}

interface PriceHistory {
  id: number;
  priceId: number;
  oldPrice: number;
  newPrice: number;
  changeReason: string;
  operator: string;
  priceType: string;
  currency: string;
  createdAt: string;
}

export default function Pricing() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Search
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState('');

  // Price types config
  const [priceTypes, setPriceTypes] = useState<string[]>(['批发价', '零售价', '促销价']);
  const [currencies, setCurrencies] = useState<string[]>(['USD', 'EUR', 'CNY']);
  const [showTypeConfig, setShowTypeConfig] = useState(false);
  const [editingTypes, setEditingTypes] = useState('');
  const [editingCurrencies, setEditingCurrencies] = useState('');
  const [newType, setNewType] = useState('');
  const [newCurrency, setNewCurrency] = useState('');

  // Create
  const [showCreate, setShowCreate] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState({ price_type: '', unit_price: '', currency: '', min_quantity: '', max_quantity: '' });

  // Batch operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchForm, setBatchForm] = useState({ price_type: '', currency: '', unit_price: '', min_quantity: '', max_quantity: '', effective_date: '', expiry_date: '', notes: '' });
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number; success: number; failed: number; errors: string[]; running: boolean } | null>(null);

  // Price history
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<PriceHistory[]>([]);
  const [historyPart, setHistoryPart] = useState<{ oeNumber: string; partNameCn: string } | null>(null);

  // Tiered view
  const [showTiered, setShowTiered] = useState(false);
  const [tieredPrices, setTieredPrices] = useState<PriceItem[]>([]);
  const [tieredPart, setTieredPart] = useState<{ oeNumber: string; partNameCn: string } | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const params: any = { page: String(page), limit: '100' };
      if (keyword) params.keyword = keyword;
      if (filterType) params.price_type = filterType;
      const { data } = await api.get('/prices', { params });
      setPrices(data.data || []);
      setTotal(data.total || 0);
    } catch { setPrices([]); }
    finally { setLoading(false); }
  };

  const fetchTypes = async () => {
    try {
      const { data } = await api.get('/prices/config/types');
      if (data.types) setPriceTypes(data.types);
      if (data.currencies) setCurrencies(data.currencies);
    } catch { /* use defaults */ }
  };

  useEffect(() => { fetchPrices(); }, [page, keyword, filterType]);
  useEffect(() => { fetchTypes(); }, []);

  const handleSearch = () => { setPage(1); fetchPrices(); };

  const handleSync = async () => {
    try {
      const { data } = await api.post('/prices/sync');
      success(`同步完成：新增 ${data.synced} 条，跳过 ${data.skipped} 条已有价格的配件`);
      fetchPrices();
    } catch (err: any) { error(err.response?.data?.message || '同步失败'); }
  };

  // Inline edit
  const startInlineEdit = (p: PriceItem) => {
    setEditingId(p.id);
    setEditRow({
      price_type: p.priceType,
      unit_price: String(p.unitPrice),
      currency: p.currency,
      min_quantity: String(p.minQuantity),
      max_quantity: String(p.maxQuantity),
    });
  };

  const saveInlineEdit = async (id: number) => {
    try {
      await api.put(`/prices/${id}`, {
        price_type: editRow.price_type,
        unit_price: Number(editRow.unit_price),
        currency: editRow.currency,
        min_quantity: Number(editRow.min_quantity),
        max_quantity: Number(editRow.max_quantity),
      });
      // Update local state directly
      setPrices(prev => prev.map(p => p.id === id ? {
        ...p,
        priceType: editRow.price_type,
        unitPrice: Number(editRow.unit_price),
        currency: editRow.currency,
        minQuantity: Number(editRow.min_quantity),
        maxQuantity: Number(editRow.max_quantity),
      } : p));
      setEditingId(null);
    } catch (err: any) { error(err.response?.data?.message || '修改失败'); }
  };

  const cancelInlineEdit = () => { setEditingId(null); };

  // Batch operations
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === prices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(prices.map(p => p.id)));
  };

  const handleBatchEdit = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const body: any = { ids };
    for (const [k, v] of Object.entries(batchForm)) {
      if (v) body[k] = v;
    }
    if (Object.keys(body).length <= 1) { success('请填写至少一个修改项'); return; }
    setShowBatchEdit(false);
    try {
      const { data } = await api.post('/prices/batch-update', body);
      setBatchProgress({ total: ids.length, done: ids.length, success: data.updated || ids.length, failed: 0, errors: [], running: false });
    } catch (err: any) {
      setBatchProgress({ total: ids.length, done: ids.length, success: 0, failed: ids.length, errors: [err.response?.data?.message || '批量更新失败'], running: false });
    }
    setBatchForm({ price_type: '', currency: '', unit_price: '', min_quantity: '', max_quantity: '', effective_date: '', expiry_date: '', notes: '' });
    fetchPrices();
  };

  const handleBatchDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const confirmed = await confirm({ message: `确定删除选中的 ${ids.length} 条价格？`, variant: "danger" });
      if (!confirmed) return;
    try {
      const { data } = await api.post('/prices/batch-delete', { ids });
      setBatchProgress({ total: ids.length, done: ids.length, success: data.deleted || ids.length, failed: 0, errors: [], running: false });
    } catch (err: any) {
      setBatchProgress({ total: ids.length, done: ids.length, success: 0, failed: ids.length, errors: [err.response?.data?.message || '批量删除失败'], running: false });
    }
    setSelectedIds(new Set());
    fetchPrices();
  };

  // Price history
  const openHistory = async (p: PriceItem) => {
    setHistoryPart({ oeNumber: p.part?.oeNumber || '', partNameCn: p.part?.partNameCn || '' });
    try {
      const { data } = await api.get(`/prices/history/${p.partId}`);
      setHistoryData(data || []);
    } catch { setHistoryData([]); }
    setShowHistory(true);
  };

  // Tiered price view
  const openTiered = async (p: PriceItem) => {
    setTieredPart({ oeNumber: p.part?.oeNumber || '', partNameCn: p.part?.partNameCn || '' });
    try {
      const { data } = await api.get(`/prices/part/${p.partId}`);
      setTieredPrices(data || []);
    } catch { setTieredPrices([]); }
    setShowTiered(true);
  };

  // Type config
  const openTypeConfig = () => {
    setEditingTypes(priceTypes.join('\n'));
    setEditingCurrencies(currencies.join('\n'));
    setNewType('');
    setNewCurrency('');
    setShowTypeConfig(true);
  };

  const saveTypeConfig = async (types: string[], curs: string[]) => {
    if (types.length === 0) { success('至少保留一个价格类型'); return; }
    try {
      await api.put('/prices/config/types', { types, currencies: curs });
      setPriceTypes(types);
      setCurrencies(curs);
      setShowTypeConfig(false);
    } catch { success('保存失败'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">价格管理</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openTypeConfig}><Settings size={16} className="mr-1" />类型管理</Button>
          <Button variant="secondary" onClick={handleSync}><RefreshCw size={16} className="mr-1" />从配件目录同步</Button>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" />设置价格</Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-end gap-3 rounded-lg bg-gray-50 p-4">
        <div className="flex-1">
          <Input label="搜索" placeholder="OE编号 / 中文名称 / 品牌" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        </div>
        <div className="w-40">
          <Select label="价格类型" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">全部</option>
            {priceTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <Button onClick={handleSearch}><Search size={16} className="mr-1" />搜索</Button>
      </div>

      {/* Batch operations bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <span className="text-sm text-blue-700">已选 {selectedIds.size} 项</span>
          <Button size="sm" variant="secondary" onClick={() => setShowBatchEdit(true)}><Pencil className="mr-1 h-3.5 w-3.5" /> 批量编辑</Button>
          <Button size="sm" variant="secondary" onClick={handleBatchDelete}><Trash2 className="mr-1 h-3.5 w-3.5" /> 批量删除</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
        </div>
      )}

      {/* Price table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : prices.length === 0 ? (
          <p className="py-12 text-center text-gray-500">暂无价格数据</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/80 text-left">
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedIds.size === prices.length && prices.length > 0} onChange={toggleSelectAll} /></th>
                <th className="px-4 py-3 font-medium">OE 编号</th>
                <th className="px-4 py-3 font-medium">中文名称</th>
                <th className="px-4 py-3 font-medium">品牌</th>
                <th className="px-4 py-3 font-medium">价格类型</th>
                <th className="px-4 py-3 font-medium text-right">单价</th>
                <th className="px-4 py-3 font-medium text-right">数量区间</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                  <td className="px-4 py-3 font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => openTiered(p)}>{p.part?.oeNumber || `#${p.partId}`}</td>
                  <td className="px-4 py-3">{p.part?.partNameCn || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.part?.brand || '-'}</td>
                  {editingId === p.id ? (
                    <>
                      <td className="px-4 py-2">
                        <select className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-1.5 py-1 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" value={editRow.price_type} onChange={(e) => setEditRow({ ...editRow, price_type: e.target.value })}>
                          {priceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <select className="w-16 rounded-lg border border-gray-200 bg-gray-50/50 px-1.5 py-1 text-xs focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" value={editRow.currency} onChange={(e) => setEditRow({ ...editRow, currency: e.target.value })}>
                            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input type="number" step="0.01" className="w-24 rounded border px-2 py-1 text-right text-sm" value={editRow.unit_price} onChange={(e) => setEditRow({ ...editRow, unit_price: e.target.value })} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(p.id); if (e.key === 'Escape') cancelInlineEdit(); }} />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input type="number" className="w-16 rounded border px-1.5 py-1 text-right text-sm" value={editRow.min_quantity} onChange={(e) => setEditRow({ ...editRow, min_quantity: e.target.value })} />
                          <span className="text-gray-400">-</span>
                          <input type="number" className="w-16 rounded border px-1.5 py-1 text-right text-sm" value={editRow.max_quantity} onChange={(e) => setEditRow({ ...editRow, max_quantity: e.target.value })} />
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 cursor-pointer hover:bg-blue-50" onClick={() => startInlineEdit(p)} title="点击编辑"><Badge>{p.priceType}</Badge></td>
                      <td className="px-4 py-3 text-right font-mono cursor-pointer hover:bg-blue-50" onClick={() => startInlineEdit(p)} title="点击编辑">
                        {p.currency} {Number(p.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50" onClick={() => startInlineEdit(p)} title="点击编辑">{p.minQuantity} - {p.maxQuantity}</td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => saveInlineEdit(p.id)} className="rounded p-1 text-green-600 hover:bg-green-50" title="保存"><Check size={14} /></button>
                        <button onClick={cancelInlineEdit} className="rounded p-1 text-gray-400 hover:bg-gray-100" title="取消"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openHistory(p)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="价格历史"><History size={14} /></button>
                        <button onClick={async () => { if (await confirm({ message: '确定删除此价格？', variant: 'danger' })) api.delete(`/prices/${p.id}`).then(fetchPrices); }} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="删除"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {Math.ceil(total / 100) > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-gray-500">共 {total} 条</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
              <span className="py-2 text-sm">{page} / {Math.ceil(total / 100)}</span>
              <Button variant="ghost" size="sm" disabled={page >= Math.ceil(total / 100)} onClick={() => setPage(page + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreatePriceModal
          priceTypes={priceTypes}
          currencies={currencies}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchPrices}
        />
      )}

      {/* Batch Edit Modal */}
      <Modal isOpen={showBatchEdit} onClose={() => setShowBatchEdit(false)} title={`批量编辑 ${selectedIds.size} 条`} size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">仅填写需要修改的字段，留空则不修改</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="单价" type="number" step="0.01" value={batchForm.unit_price} onChange={(e) => setBatchForm({ ...batchForm, unit_price: e.target.value })} />
            <Select label="价格类型" value={batchForm.price_type} onChange={(e) => setBatchForm({ ...batchForm, price_type: e.target.value })}>
              <option value="">不修改</option>
              {priceTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="货币" value={batchForm.currency} onChange={(e) => setBatchForm({ ...batchForm, currency: e.target.value })}>
              <option value="">不修改</option>
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input label="最小数量" type="number" value={batchForm.min_quantity} onChange={(e) => setBatchForm({ ...batchForm, min_quantity: e.target.value })} />
            <Input label="最大数量" type="number" value={batchForm.max_quantity} onChange={(e) => setBatchForm({ ...batchForm, max_quantity: e.target.value })} />
            <Input label="生效日期" type="date" value={batchForm.effective_date} onChange={(e) => setBatchForm({ ...batchForm, effective_date: e.target.value })} />
            <Input label="失效日期" type="date" value={batchForm.expiry_date} onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} />
          </div>
          <Input label="备注" value={batchForm.notes} onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowBatchEdit(false)}>取消</Button><Button onClick={handleBatchEdit}>确认修改</Button></div>
        </div>
      </Modal>

      {/* Price History Modal */}
      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title={`价格历史 - ${historyPart?.oeNumber || ''} ${historyPart?.partNameCn || ''}`} size="lg">
        {historyData.length === 0 ? (
          <p className="py-8 text-center text-gray-500">暂无调价记录</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">时间</th>
                <th className="pb-2 font-medium">类型</th>
                <th className="pb-2 font-medium text-right">旧价格</th>
                <th className="pb-2 font-medium text-right">新价格</th>
                <th className="pb-2 font-medium text-right">变动</th>
                <th className="pb-2 font-medium">原因</th>
                <th className="pb-2 font-medium">操作人</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map(h => {
                const diff = Number(h.newPrice) - Number(h.oldPrice);
                const pct = h.oldPrice > 0 ? ((diff / Number(h.oldPrice)) * 100).toFixed(1) : '-';
                return (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2 text-gray-500">{new Date(h.createdAt).toLocaleString()}</td>
                    <td className="py-2">{h.priceType}</td>
                    <td className="py-2 text-right font-mono">{h.currency} {Number(h.oldPrice).toFixed(2)}</td>
                    <td className="py-2 text-right font-mono">{h.currency} {Number(h.newPrice).toFixed(2)}</td>
                    <td className={`py-2 text-right font-mono ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)} ({pct}%)
                    </td>
                    <td className="py-2 text-gray-500">{h.changeReason || '-'}</td>
                    <td className="py-2">{h.operator}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Modal>

      {/* Tiered Price View Modal */}
      <Modal isOpen={showTiered} onClose={() => setShowTiered(false)} title={`价目表 - ${tieredPart?.oeNumber || ''} ${tieredPart?.partNameCn || ''}`} size="lg">
        {tieredPrices.length === 0 ? (
          <p className="py-8 text-center text-gray-500">暂无价格数据</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">价格类型</th>
                <th className="pb-2 font-medium text-right">单价</th>
                <th className="pb-2 font-medium">货币</th>
                <th className="pb-2 font-medium text-right">数量区间</th>
                <th className="pb-2 font-medium">生效日期</th>
                <th className="pb-2 font-medium">失效日期</th>
              </tr>
            </thead>
            <tbody>
              {tieredPrices.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2"><Badge>{p.priceType}</Badge></td>
                  <td className="py-2 text-right font-mono">{Number(p.unitPrice).toFixed(2)}</td>
                  <td className="py-2">{p.currency}</td>
                  <td className="py-2 text-right">{p.minQuantity} - {p.maxQuantity}</td>
                  <td className="py-2">{p.effectiveDate?.slice(0, 10) || '-'}</td>
                  <td className="py-2">{p.expiryDate?.slice(0, 10) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {/* Price Type Config Modal */}
      <Modal isOpen={showTypeConfig} onClose={() => setShowTypeConfig(false)} title="价格类型管理" size="lg">
        <TypeConfigForm
          initialTypes={editingTypes}
          initialCurrencies={editingCurrencies}
          onSave={saveTypeConfig}
          onCancel={() => setShowTypeConfig(false)}
        />
      </Modal>

      {/* Batch Progress Modal */}
      {batchProgress && (
        <Modal isOpen={true} onClose={() => !batchProgress.running && setBatchProgress(null)} title="批量操作进度">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-2xl font-bold">{batchProgress.done}</p><p className="text-xs text-gray-500">已完成</p></div>
              <div className="rounded-lg bg-green-50 p-3"><p className="text-2xl font-bold text-green-600">{batchProgress.success}</p><p className="text-xs text-gray-500">成功</p></div>
              <div className="rounded-lg bg-red-50 p-3"><p className="text-2xl font-bold text-red-600">{batchProgress.failed}</p><p className="text-xs text-gray-500">失败</p></div>
            </div>
            {batchProgress.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded bg-red-50 p-3 text-sm text-red-600">{batchProgress.errors.map((e, i) => <p key={i}>{e}</p>)}</div>
            )}
            {!batchProgress.running && <div className="flex justify-end"><Button onClick={() => setBatchProgress(null)}>关闭</Button></div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
