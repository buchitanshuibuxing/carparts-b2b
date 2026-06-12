import { useState, useEffect, useMemo } from 'react';
import { Plus, History, RefreshCw, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PartPicker, type PartOption } from '@/components/ui/PartPicker';
import api from '@/lib/api';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
// Standalone add inventory modal to avoid cursor issues
function AddInventoryModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { success, error } = useToast();
  const [addPart, setAddPart] = useState<PartOption | null>(null);
  const [addQty, setAddQty] = useState('0');
  const [addLocation, setAddLocation] = useState('');
  const [addZone, setAddZone] = useState('默认');
  const [addNotes, setAddNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!addPart) return;
    setSaving(true);
    try {
      await api.post('/inventory', {
        part_id: addPart.id,
        quantity: Number(addQty) || 0,
        warehouse_location: addLocation,
        warehouse_zone: addZone,
        notes: addNotes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="手动添加库存" size="md">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">选择配件</label>
          <PartPicker value={addPart} onSelect={(p) => setAddPart(p)} placeholder="输入 OE 编号或名称搜索..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="初始数量" type="number" value={addQty} onChange={(e) => setAddQty(e.target.value)} />
          <Input label="库区" value={addZone} onChange={(e) => setAddZone(e.target.value)} />
        </div>
        <Input label="库位" value={addLocation} onChange={(e) => setAddLocation(e.target.value)} />
        <Input label="备注" value={addNotes} onChange={(e) => setAddNotes(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleAdd} disabled={!addPart || saving}>{saving ? '创建中...' : '创建'}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Inventory() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<any>({ items: [], total: 0, page: 1, page_size: 100, total_pages: 0 });
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  // Add inventory modal
  const [showAdd, setShowAdd] = useState(false);

  // Logs modal
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any>({ items: [], total: 0 });
  const [logPage, setLogPage] = useState(1);
  const [logPartInfo, setLogPartInfo] = useState<any>(null);
  const [logKeyword, setLogKeyword] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Sort and filter
  const [sortKey, setSortKey] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterZone, setFilterZone] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  // Batch operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchEditForm, setBatchEditForm] = useState({ warehouse_location: '', warehouse_zone: '', min_stock: '', max_stock: '', notes: '' });
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number; success: number; failed: number; errors: string[]; running: boolean } | null>(null);

  const fetchData = async () => {
    const params: any = { page, page_size: 100 };
    if (keyword) params.keyword = keyword;
    const { data: res } = await api.get('/inventory', { params });
    setData(res.data || res);
    setSelectedIds(new Set());
  };

  useEffect(() => { fetchData(); }, [page, keyword]);

  // Extract unique zones and locations for filter dropdowns
  const allItems = data.items || [];
  const zones = useMemo(() => [...new Set(allItems.map((r: any) => r.warehouseZone).filter(Boolean))].sort() as string[], [allItems]);
  const locations = useMemo(() => [...new Set(allItems.map((r: any) => r.warehouseLocation).filter(Boolean))].sort() as string[], [allItems]);

  // Apply filters and sorting
  const displayItems = useMemo(() => {
    let items = [...allItems];
    if (filterZone) items = items.filter((r: any) => r.warehouseZone === filterZone);
    if (filterLocation) items = items.filter((r: any) => r.warehouseLocation === filterLocation);
    if (sortKey) {
      items.sort((a: any, b: any) => {
        const va = a[sortKey] ?? 0;
        const vb = b[sortKey] ?? 0;
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [allItems, filterZone, filterLocation, sortKey, sortOrder]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortKey !== column) return <ArrowUpDown className="inline ml-1 h-3 w-3 text-gray-300" />;
    return sortOrder === 'asc' ? <ArrowUp className="inline ml-1 h-3 w-3 text-blue-500" /> : <ArrowDown className="inline ml-1 h-3 w-3 text-blue-500" />;
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const items = data.items || [];
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i: any) => i.id)));
    }
  };

  const handleBatchEdit = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const body: any = {};
    if (batchEditForm.warehouse_location) body.warehouse_location = batchEditForm.warehouse_location;
    if (batchEditForm.warehouse_zone) body.warehouse_zone = batchEditForm.warehouse_zone;
    if (batchEditForm.min_stock) body.min_stock = Number(batchEditForm.min_stock);
    if (batchEditForm.max_stock) body.max_stock = Number(batchEditForm.max_stock);
    if (batchEditForm.notes) body.notes = batchEditForm.notes;
    if (Object.keys(body).length === 0) { warning('请填写至少一个修改项'); return; }
    setShowBatchEdit(false);
    setBatchProgress({ total: ids.length, done: 0, success: 0, failed: 0, errors: [], running: true });
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await api.put(`/inventory/${id}`, body);
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`ID ${id}: ${err.response?.data?.message || '更新失败'}`);
      }
      setBatchProgress({ total: ids.length, done: successCount + failedCount, success: successCount, failed: failedCount, errors, running: true });
    }
    setBatchProgress(prev => ({ ...prev!, running: false }));
    setBatchEditForm({ warehouse_location: '', warehouse_zone: '', min_stock: '', max_stock: '', notes: '' });
    fetchData();
  };

  const handleBatchDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const confirmed = await confirm({ message: `确定删除选中的 ${ids.length} 条库存记录？`, variant: "danger" });
      if (!confirmed) return;
    setBatchProgress({ total: ids.length, done: 0, success: 0, failed: 0, errors: [], running: true });
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await api.delete(`/inventory/${id}`);
        success++;
      } catch (err: any) {
        failed++;
        errors.push(`ID ${id}: ${err.response?.data?.message || '删除失败'}`);
      }
      setBatchProgress({ total: ids.length, done: success + failed, success, failed, errors, running: true });
    }
    setBatchProgress(prev => ({ ...prev!, running: false }));
    fetchData();
  };

  const handleAdjust = async () => {
    if (!adjustModal || !delta) return;
    await api.post('/inventory/adjust', { part_id: adjustModal.partId, delta: Number(delta), reason });
    setAdjustModal(null); setDelta(''); setReason('');
    fetchData();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/inventory/sync');
      alert(data.message || `已同步 ${data.synced} 个配件`);
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.message || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const openLogs = async (row: any) => {
    const partInfo = { oeNumber: row.oe_number || row.oeNumber, partNameCn: row.part_name_cn || row.partNameCn };
    setLogPartInfo(partInfo);
    setLogPage(1);
    setShowLogs(true);
    await fetchLogs(row.partId, 1);
  };

  const fetchLogs = async (partId: number, p: number) => {
    try {
      const { data: res } = await api.get(`/inventory/logs/${partId}`, { params: { page: p, page_size: 15 } });
      setLogs(res.data || res);
    } catch { setLogs({ items: [], total: 0 }); }
  };

  const changeTypeLabel: Record<string, { label: string; color: string }> = {
    IN: { label: '入库', color: 'green' },
    OUT: { label: '出库', color: 'red' },
    ADJUST: { label: '调整', color: 'blue' },
    UPDATE: { label: '修改', color: 'yellow' },
  };

  const columns = [
    {
      key: 'oe_number', title: 'OE 编号',
      render: (r: any) => <span className="font-mono text-blue-600">{r.oe_number || '-'}</span>,
    },
    {
      key: 'part_name_cn', title: '中文名称',
      render: (r: any) => r.part_name_cn || '-',
    },
    {
      key: 'quantity', title: <span className="cursor-pointer select-none" onClick={() => toggleSort('quantity')}>当前库存 <SortIcon column="quantity" /></span>,
      render: (r: any) => <span className={r.quantity <= r.minStock ? 'text-red-600 font-bold' : ''}>{r.quantity}</span>,
    },
    { key: 'reservedQuantity', title: <span className="cursor-pointer select-none" onClick={() => toggleSort('reservedQuantity')}>预留 <SortIcon column="reservedQuantity" /></span> },
    { key: 'minStock', title: <span className="cursor-pointer select-none" onClick={() => toggleSort('minStock')}>最低库存 <SortIcon column="minStock" /></span> },
    { key: 'warehouseLocation', title: '库位' },
    {
      key: 'warehouseZone', title: '库区',
      render: (r: any) => <Badge>{r.warehouseZone}</Badge>,
    },
    {
      key: 'actions', title: '操作',
      render: (r: any) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setAdjustModal(r); setDelta(''); }}>调整</Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openLogs(r); }}>
            <History className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">库存管理</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-1 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> 从配件目录同步
          </Button>
          <Button variant="secondary" onClick={() => { setShowLogs(true); setLogPartInfo(null); setLogKeyword(''); setLogPage(1); fetchAllLogs(1); }}>
            <History className="mr-1 h-4 w-4" /> 操作记录
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" /> 手动添加
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <span className="text-sm text-blue-700">已选 {selectedIds.size} 项</span>
          <Button size="sm" variant="secondary" onClick={() => setShowBatchEdit(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> 批量编辑
          </Button>
          <Button size="sm" variant="secondary" onClick={handleBatchDelete}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> 批量删除
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <input className="px-4 py-2 border border-gray-200 bg-gray-50/50 rounded-lg text-sm max-w-md focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-150" placeholder="搜索 OE 编号或名称..." value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
        <select className="px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
          <option value="">全部库区</option>
          {zones.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <select className="px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="">全部库位</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        {(filterZone || filterLocation || sortKey) && (
          <button className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 underline" onClick={() => { setFilterZone(''); setFilterLocation(''); setSortKey(''); }}>清除筛选</button>
        )}
      </div>
      <div className="bg-white rounded-xl border border-gray-200">
        <Table
          columns={columns}
          data={displayItems}
          keyField="id"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
        />
        <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
      </div>

      {/* Adjust Modal */}
      <Modal isOpen={!!adjustModal} onClose={() => setAdjustModal(null)} title="调整库存">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {adjustModal?.oe_number || `配件ID: ${adjustModal?.partId}`}
            {adjustModal?.part_name_cn && ` - ${adjustModal.part_name_cn}`}
            ，当前库存: {adjustModal?.quantity}
          </p>
          <Input label="变动数量（正数入库，负数出库）" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <Input label="原因" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustModal(null)}>取消</Button>
            <Button onClick={handleAdjust}>确认</Button>
          </div>
        </div>
      </Modal>

      {/* Add Inventory Modal */}
      {showAdd && (
        <AddInventoryModal
          onClose={() => setShowAdd(false)}
          onSuccess={fetchData}
        />
      )}

      {/* Batch Edit Modal */}
      <Modal isOpen={showBatchEdit} onClose={() => setShowBatchEdit(false)} title={`批量编辑 ${selectedIds.size} 项`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">仅填写需要修改的字段，留空则不修改</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="库位" value={batchEditForm.warehouse_location}
              onChange={(e) => setBatchEditForm({ ...batchEditForm, warehouse_location: e.target.value })} />
            <Input label="库区" value={batchEditForm.warehouse_zone}
              onChange={(e) => setBatchEditForm({ ...batchEditForm, warehouse_zone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="最低库存" type="number" value={batchEditForm.min_stock}
              onChange={(e) => setBatchEditForm({ ...batchEditForm, min_stock: e.target.value })} />
            <Input label="最高库存" type="number" value={batchEditForm.max_stock}
              onChange={(e) => setBatchEditForm({ ...batchEditForm, max_stock: e.target.value })} />
          </div>
          <Input label="备注" value={batchEditForm.notes}
            onChange={(e) => setBatchEditForm({ ...batchEditForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowBatchEdit(false)}>取消</Button>
            <Button onClick={handleBatchEdit}>确认修改</Button>
          </div>
        </div>
      </Modal>

      {/* Batch Progress Modal */}
      {batchProgress && (
        <Modal isOpen={true} onClose={() => !batchProgress.running && setBatchProgress(null)} title="批量操作进度">
          <div className="space-y-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold">{batchProgress.done}</p>
                <p className="text-xs text-gray-500">已完成</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-600">{batchProgress.success}</p>
                <p className="text-xs text-gray-500">成功</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-600">{batchProgress.failed}</p>
                <p className="text-xs text-gray-500">失败</p>
              </div>
            </div>
            {batchProgress.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded bg-red-50 p-3 text-sm text-red-600">
                {batchProgress.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            {!batchProgress.running && (
              <div className="flex justify-end">
                <Button onClick={() => setBatchProgress(null)}>关闭</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Logs Modal */}
      <Modal isOpen={showLogs} onClose={() => { setShowLogs(false); setLogKeyword(''); }} title="操作记录" size="lg">
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150"
              placeholder="搜索 OE 编号或名称..."
              value={logKeyword}
              onChange={(e) => {
                setLogKeyword(e.target.value);
                setLogPage(1);
                setLogPartInfo(null);
                fetchAllLogs(1, e.target.value);
              }}
            />
            {logKeyword && (
              <Button variant="ghost" onClick={() => { setLogKeyword(''); setLogPage(1); setLogPartInfo(null); fetchAllLogs(1); }}>
                清除
              </Button>
            )}
          </div>
          {logPartInfo && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">当前:</span>
              <Badge color="blue">{logPartInfo.oeNumber}</Badge>
              <span className="text-gray-600">{logPartInfo.partNameCn}</span>
              <button className="ml-1 text-gray-400 hover:text-gray-600" onClick={() => { setLogPartInfo(null); fetchAllLogs(1, logKeyword); }}>×</button>
            </div>
          )}
          {logs.items?.length === 0 ? (
            <p className="py-8 text-center text-gray-500">暂无记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {!logPartInfo && <th className="pb-2 font-medium">配件</th>}
                    <th className="pb-2 font-medium">类型</th>
                    <th className="pb-2 font-medium text-right">变动</th>
                    <th className="pb-2 font-medium text-right">变动前</th>
                    <th className="pb-2 font-medium text-right">变动后</th>
                    <th className="pb-2 font-medium">原因</th>
                    <th className="pb-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.items?.map((log: any) => (
                    <tr key={log.id} className="border-b last:border-0">
                      {!logPartInfo && (
                        <td className="py-2">
                          <span className="font-mono text-blue-600">{log.oe_number || '-'}</span>
                          {log.part_name_cn && <span className="ml-1 text-gray-500">{log.part_name_cn}</span>}
                        </td>
                      )}
                      <td className="py-2">
                        <Badge color={changeTypeLabel[log.changeType]?.color || 'gray'}>
                          {changeTypeLabel[log.changeType]?.label || log.changeType}
                        </Badge>
                      </td>
                      <td className="py-2 text-right font-mono">
                        {log.changeType === 'OUT' ? '-' : '+'}{log.quantityChange}
                      </td>
                      <td className="py-2 text-right text-gray-500">{log.quantityBefore}</td>
                      <td className="py-2 text-right font-medium">{log.quantityAfter}</td>
                      <td className="py-2 text-gray-500">{log.reason || '-'}</td>
                      <td className="py-2 text-gray-400">{log.createdAt?.slice(0, 16).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {logs.total > 15 && (
            <Pagination page={logPage} pageSize={15} total={logs.total} onChange={(p) => {
              setLogPage(p);
              if (logPartInfo) {
                const item = data.items?.find((i: any) => (i.oe_number || i.oeNumber) === logPartInfo.oeNumber);
                if (item) fetchLogs(item.partId, p);
              } else {
                fetchAllLogs(p, logKeyword);
              }
            }} />
          )}
        </div>
      </Modal>
    </div>
  );

  async function fetchAllLogs(p: number, kw?: string) {
    try {
      const params: any = { page: p, page_size: 20 };
      if (kw) params.keyword = kw;
      const { data: res } = await api.get('/inventory/logs', { params });
      setLogs(res.data || res);
    } catch { setLogs({ items: [], total: 0 }); }
  }
}
