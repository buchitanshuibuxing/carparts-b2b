import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Eye, Trash2, Pencil, Search, Settings } from 'lucide-react';
import api from '@/lib/api';
import { useCurrencies, getCurrencyName } from '@/hooks/useCurrencies';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

const COLOR_OPTIONS = [
  { value: 'yellow', label: '黄色', hex: '#eab308' },
  { value: 'blue', label: '蓝色', hex: '#3b82f6' },
  { value: 'purple', label: '紫色', hex: '#a855f7' },
  { value: 'green', label: '绿色', hex: '#22c55e' },
  { value: 'red', label: '红色', hex: '#ef4444' },
  { value: 'gray', label: '灰色', hex: '#6b7280' },
  { value: 'orange', label: '橙色', hex: '#f97316' },
  { value: 'pink', label: '粉色', hex: '#ec4899' },
  { value: 'cyan', label: '青色', hex: '#06b6d4' },
];

// Standalone status manager component to avoid cursor issues
function OrderStatusManager({ initialStatuses, onClose, onSave }: {
  initialStatuses: Array<{ key: string; label: string; color: string }>;
  onClose: () => void;
  onSave: (statuses: Array<{ key: string; label: string; color: string }>) => void;
}) {
  const [statusList, setStatusList] = useState(initialStatuses);

  const handleAdd = () => {
    setStatusList(prev => [...prev, { key: `status_${prev.length + 1}`, label: '', color: 'gray' }]);
  };

  const handleDelete = (idx: number) => {
    setStatusList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleChange = (idx: number, field: string, value: string) => {
    setStatusList(prev => {
      const n = [...prev];
      n[idx] = { ...n[idx], [field]: value };
      return n;
    });
  };

  const handleSave = () => {
    onSave(statusList);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="订单状态管理" size="2xl">
      <div className="space-y-3">
        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_1fr_140px_40px] gap-2 px-2 text-xs font-medium text-gray-500">
          <div>颜色</div>
          <div>状态名称</div>
          <div>标识 (自动生成)</div>
          <div>色值</div>
          <div></div>
        </div>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {statusList.map((s, idx) => {
            const colorHex = COLOR_OPTIONS.find(c => c.value === s.color)?.hex || '#6b7280';
            return (
              <div key={idx} className="grid grid-cols-[40px_1fr_1fr_140px_40px] gap-2 items-center px-2 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: colorHex }} />
                </div>
                <input
                  className="rounded border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none bg-white"
                  placeholder="如：待确认"
                  value={s.label}
                  onChange={(e) => handleChange(idx, 'label', e.target.value)}
                />
                <div className="px-2.5 py-1.5 text-sm text-gray-400 bg-gray-100 rounded border border-gray-200 truncate font-mono">{s.key || '自动生成'}</div>
                <div className="relative">
                  <select
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm pr-7 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none bg-white cursor-pointer transition-all duration-150"
                    value={s.color}
                    onChange={(e) => handleChange(idx, 'color', e.target.value)}
                  >
                    {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full pointer-events-none border border-gray-200" style={{ backgroundColor: colorHex }} />
                </div>
                <button onClick={() => handleDelete(idx)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 mx-auto"><Trash2 className="h-4 w-4" /></button>
              </div>
            );
          })}
          {statusList.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">暂无状态，点击下方添加</p>}
        </div>
        <div className="flex gap-2 border-t pt-3">
          <Button variant="secondary" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />添加状态</Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}
import { Select } from '@/components/ui/Select';
import { PartPicker, type PartOption } from '@/components/ui/PartPicker';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
// Standalone create order modal to avoid cursor issues
function CreateOrderModal({ currencies, packageOptions, onClose, onSuccess }: {
  currencies: string[];
  packageOptions: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { success, error } = useToast();
  const [form, setForm] = useState({ customer_id: '', currency: 'USD', shipping_method: '', shipping_address: '', shipping_cost: '', notes: '' });
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [allowNegative, setAllowNegative] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchCustomers = async (keyword: string) => {
    if (!keyword.trim()) { setCustomerResults([]); return; }
    try {
      const { data } = await api.get('/customers', { params: { keyword, page_size: '20' } });
      setCustomerResults(data.items || data.data || []);
    } catch { setCustomerResults([]); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) return success('请选择客户');
    if (!orderItems.length) return success('请至少添加一个商品');
    setSaving(true);
    try {
      await api.post('/orders', {
        customer_id: Number(form.customer_id),
        currency: form.currency,
        shipping_method: form.shipping_method, shipping_address: form.shipping_address, notes: form.notes,
        shipping_cost: Number(form.shipping_cost) || 0,
        allow_negative: allowNegative,
        items: orderItems.map(i => ({ part_id: i.part_id, quantity: i.quantity, unit_price: i.unit_price, package_name: i.package_name })),
      });
      onSuccess();
      onClose();
    } catch (err: any) { error(err.response?.data?.message || '创建失败'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="新建订单" size="3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Order info section */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">订单信息</h4>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-1 relative">
              <label className="mb-1 block text-xs font-medium text-gray-600">客户 *</label>
              <input type="text" placeholder="搜索公司名称..." value={customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); searchCustomers(e.target.value); }}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 px-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" />
              {customerResults.length > 0 && !selectedCustomer && (
                <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded border bg-white shadow-lg">
                  {customerResults.map(c => (
                    <button key={c.id} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setForm({ ...form, customer_id: String(c.id), currency: c.currency || form.currency });
                        setCustomerSearch(c.companyName);
                        setCustomerResults([]);
                      }}>
                      <span className="font-medium">{c.companyName}</span>
                      {c.contactPerson && <span className="ml-2 text-gray-400">({c.contactPerson})</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <p className="mt-1 text-xs text-green-600">{selectedCustomer.companyName}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">货币</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 px-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150">
                {currencies.map(c => <option key={c} value={c}>{c} - {getCurrencyName(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">运输方式</label>
              <input value={form.shipping_method} onChange={(e) => setForm({ ...form, shipping_method: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 px-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" placeholder="海运/空运/快递" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">收货地址</label>
              <input value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 px-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" placeholder="收货地址" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">运费</label>
              <input type="number" step="0.01" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 px-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" placeholder="0.00" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">备注</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 px-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150" rows={2} placeholder="订单备注" />
          </div>
        </div>

        {/* Items section */}
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">订单商品</h4>
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input type="checkbox" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} className="rounded" />
              允许负库存
            </label>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">添加商品</label>
            <PartPicker
              onSelect={(part) => {
                if (part && !orderItems.find(i => i.part_id === part.id)) {
                  setOrderItems([...orderItems, {
                    part_id: part.id, oe_number: part.oeNumber, part_name_cn: part.partNameCn,
                    brand: part.brand, package_name: '', quantity: 1, unit_price: 0,
                  }]);
                }
              }}
              placeholder="输入 OE 编号或名称搜索配件..."
            />
          </div>
          {orderItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无商品，请点击上方添加</p>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_100px_100px_100px_100px_40px] gap-2 items-center bg-white rounded-lg p-2 border">
                  <div className="text-sm">
                    <span className="font-medium">{item.oe_number}</span>
                    {item.part_name_cn && <span className="ml-2 text-gray-500">{item.part_name_cn}</span>}
                  </div>
                  <select value={item.package_name} onChange={(e) => { const n = [...orderItems]; n[idx] = { ...n[idx], package_name: e.target.value }; setOrderItems(n); }}
                    className="rounded border border-gray-200 px-2 py-1 text-sm">
                    <option value="">包装</option>
                    {packageOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input type="number" value={item.quantity} onChange={(e) => { const n = [...orderItems]; n[idx] = { ...n[idx], quantity: Number(e.target.value) }; setOrderItems(n); }}
                    className="rounded border border-gray-200 px-2 py-1 text-sm" placeholder="数量" />
                  <input type="number" step="0.01" value={item.unit_price} onChange={(e) => { const n = [...orderItems]; n[idx] = { ...n[idx], unit_price: Number(e.target.value) }; setOrderItems(n); }}
                    className="rounded border border-gray-200 px-2 py-1 text-sm" placeholder="单价" />
                  <div className="text-sm font-medium text-right">{(item.quantity * item.unit_price).toFixed(2)}</div>
                  <button type="button" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving}>{saving ? '创建中...' : '创建订单'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const DEFAULT_ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'yellow' },
  confirmed: { label: '已确认', color: 'blue' },
  shipped: { label: '已发货', color: 'purple' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'red' },
};

interface Order {
  id: number;
  orderNumber: string;
  quotationNumber?: string;
  customerId: number;
  orderDate: string;
  status: string;
  totalAmount: number | string;
  shippingCost: number | string;
  currency: string;
  notes: string;
  customer?: { id: number; companyName: string; contactPerson: string } | null;
}

interface Customer {
  id: number;
  companyName: string;
  contactPerson: string;
  currency?: string;
}

interface CreateOrderItem {
  part_id: number;
  oe_number: string;
  part_name_cn: string;
  brand: string;
  package_name: string;
  quantity: number;
  unit_price: number;
}

export default function Orders() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const currencies = useCurrencies();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchStatus, setShowBatchStatus] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, { label: string; color: string }>>(DEFAULT_ORDER_STATUSES);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [statusList, setStatusList] = useState<Array<{ key: string; label: string; color: string }>>([]);
  const [packageOptions, setPackageOptions] = useState<string[]>(['Hyundai', 'KIA', 'Mobis', 'Other']);

  const DEFAULT_STATUS_LIST = [
    { key: 'pending', label: '待确认', color: 'yellow' },
    { key: 'confirmed', label: '已确认', color: 'blue' },
    { key: 'shipped', label: '已发货', color: 'purple' },
    { key: 'completed', label: '已完成', color: 'green' },
    { key: 'cancelled', label: '已取消', color: 'red' },
  ];

  const fetchOrderStatuses = async () => {
    try {
      const { data } = await api.get('/settings');
      const s = data.data || data || {};
      if (s.order_statuses) {
        const arr = JSON.parse(s.order_statuses);
        const map: Record<string, { label: string; color: string }> = {};
        arr.forEach((item: any) => { if (item.key) map[item.key] = { label: item.label, color: item.color }; });
        if (Object.keys(map).length) {
          setOrderStatuses(map);
          setStatusList(arr);
          return;
        }
      }
    } catch { /* use defaults */ }
    setStatusList(DEFAULT_STATUS_LIST);
  };

  const openStatusManager = () => {
    setStatusList(statusList.length ? statusList : DEFAULT_STATUS_LIST);
    setShowStatusManager(true);
  };

  const saveStatuses = async () => {
    try {
      await api.put('/settings/order_statuses', { value: JSON.stringify(statusList) });
      const map: Record<string, { label: string; color: string }> = {};
      statusList.forEach(item => { if (item.key) map[item.key] = { label: item.label, color: item.color }; });
      setOrderStatuses(map);
      setShowStatusManager(false);
    } catch (err: any) { error(err.response?.data?.message || '保存失败'); }
  };

  useEffect(() => { fetchOrderStatuses(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '100' };
      if (search) params.keyword = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/orders', { params });
      setOrders(data.items || data.data || []);
      setTotal(data.total || 0);
    } catch { setOrders([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [page, search, statusFilter]);

  // Load package options from settings
  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      const s = data.data || data || {};
      if (s.quotation_package_options) {
        try { setPackageOptions(JSON.parse(s.quotation_package_options)); } catch {}
      }
    }).catch(() => {});
  }, []);

  const updateStatus = async (orderId: number, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    const currentLabel = orderStatuses[order?.status || '']?.label || order?.status;
    const newLabel = orderStatuses[newStatus]?.label || newStatus;
    const confirmed = await confirm({ message: `确认将订单 ${order?.orderNumber || orderId} 的状态从「${currentLabel}」改为「${newLabel}」？`, variant: "danger" });
      if (!confirmed) return;
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updatedAt: data.updatedAt || new Date().toISOString() } : o));
    } catch (err: any) { error(err.response?.data?.message || '状态更新失败'); }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAll = () => {
    selectedIds.size === orders.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(orders.map(o => o.id)));
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({ message: '确定删除此订单？', variant: 'danger' });
      if (!confirmed) return;
    try { await api.delete(`/orders/${id}`); fetchOrders(); } catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const handleBatchDelete = async () => {
    const confirmed = await confirm({ message: `确定删除选中的 ${selectedIds.size} 个订单？`, variant: "danger" });
      if (!confirmed) return;
    try {
      await api.post('/orders/batch-delete', { ids: [...selectedIds] });
      setSelectedIds(new Set());
      fetchOrders();
    } catch (err: any) { error(err.response?.data?.message || '批量删除失败'); }
  };

  const handleBatchStatus = async () => {
    if (!batchStatus) return;
    try {
      await api.post('/orders/batch-update-status', { ids: [...selectedIds], status: batchStatus });
      setSelectedIds(new Set());
      setShowBatchStatus(false);
      setBatchStatus('');
      fetchOrders();
    } catch (err: any) { error(err.response?.data?.message || '批量修改失败'); }
  };

  const statusOptions = [
    { value: '', label: '全部状态' },
    ...Object.entries(orderStatuses).map(([key, val]) => ({ value: key, label: val.label })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">订单管理</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openStatusManager}><Settings className="mr-1 h-4 w-4" /> 状态管理</Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-1 h-4 w-4" /> 新建订单</Button>
        </div>
      </div>

      <Card>
        <Card.Header>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text" placeholder="搜索订单号、客户名、配件OE号..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150"
              />
            </div>
            <div className="w-36">
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} options={statusOptions} />
            </div>
            <span className="text-sm text-gray-500">共 {total} 条</span>
          </div>
        </Card.Header>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 mx-4 mt-2">
            <span className="text-sm text-blue-700">已选 {selectedIds.size} 项</span>
            <Button size="sm" variant="secondary" onClick={() => setShowBatchStatus(true)}><Pencil className="mr-1 h-3.5 w-3.5" /> 批量修改状态</Button>
            <Button size="sm" variant="secondary" onClick={handleBatchDelete}><Trash2 className="mr-1 h-3.5 w-3.5" /> 批量删除</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
          </div>
        )}

        <Card.Body>
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
          ) : orders.length === 0 ? (
            <p className="py-12 text-center text-gray-500">暂无数据</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedIds.size === orders.length && orders.length > 0} onChange={toggleSelectAll} /></th>
                  <th className="px-4 py-3 font-medium">订单号</th>
                  <th className="px-4 py-3 font-medium">报价号</th>
                  <th className="px-4 py-3 font-medium">客户</th>
                  <th className="px-4 py-3 font-medium">日期</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">最近更新</th>
                  <th className="px-4 py-3 font-medium text-right">金额</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)} /></td>
                    <td className="px-4 py-3 font-mono text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/orders/${o.id}`)}>{o.orderNumber}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{o.quotationNumber || '-'}</td>
                    <td className="px-4 py-3">{o.customer?.companyName || `#${o.customerId}`}</td>
                    <td className="px-4 py-3">{o.orderDate?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <select value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="rounded border border-gray-200 px-2 py-1 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {Object.entries(orderStatuses).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{(o as any).updatedAt ? new Date((o as any).updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{o.currency} {Number(o.totalAmount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/orders/${o.id}`} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="查看详情"><Eye size={14} /></Link>
                        {(o.status === 'pending' || o.status === 'cancelled') && (
                          <button onClick={() => handleDelete(o.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="删除"><Trash2 size={14} /></button>
                        )}
                      </div>
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
        </Card.Body>
      </Card>

      {/* Status Manager Modal */}
      {showStatusManager && (
        <OrderStatusManager
          initialStatuses={statusList}
          onClose={() => setShowStatusManager(false)}
          onSave={(newStatuses) => {
            setStatusList(newStatuses);
            saveStatuses();
          }}
        />
      )}

      {/* Batch Status Modal */}
      <Modal isOpen={showBatchStatus} onClose={() => setShowBatchStatus(false)} title="批量修改状态" size="sm">
        <div className="space-y-4">
          <Select label="目标状态" value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)}
            options={Object.entries(orderStatuses).map(([key, val]) => ({ value: key, label: val.label }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowBatchStatus(false)}>取消</Button>
            <Button onClick={handleBatchStatus}>确认修改</Button>
          </div>
        </div>
      </Modal>

      {/* Create Modal */}
      {showCreate && (
        <CreateOrderModal
          currencies={currencies}
          packageOptions={packageOptions}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  );
}
