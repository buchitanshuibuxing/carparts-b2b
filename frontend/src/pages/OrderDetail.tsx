import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Pencil, Check, X, Trash2, Plus, Printer } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { PartPicker, type PartOption } from '@/components/ui/PartPicker';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const PACKAGE_OPTIONS = ['Hyundai', 'KIA', 'Mobis', 'Other'];

const DEFAULT_orderStatusesES: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'yellow' },
  confirmed: { label: '已确认', color: 'blue' },
  shipped: { label: '已发货', color: 'purple' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'red' },
};

interface OrderInfo {
  id: number;
  orderNumber: string;
  customerId: number;
  customer?: { id: number; companyName: string; contactPerson: string } | null;
  orderDate: string;
  status: string;
  totalAmount: number | string;
  paidAmount: number | string;
  shippingCost: number | string;
  currency: string;
  shippingMethod: string;
  shippingAddress: string;
  trackingNumber: string;
  notes: string;
}

interface OrderItem {
  id: number;
  partId: number;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  subtotal: number;
  notes: string;
  packageName?: string;
  part?: { oeNumber: string; partNameCn: string; partNameEn: string; brand: string };
}

// HTML escape function to prevent XSS
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function OrderDetail() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Order info edit
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ shipping_method: '', shipping_address: '', tracking_number: '', notes: '', paid_amount: '', shipping_cost: '' });

  // Item inline edit
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState({ quantity: '', unit_price: '', discount_pct: '', package_name: '' });

  // Add item
  const [showAddItem, setShowAddItem] = useState(false);
  const [allowNegative, setAllowNegative] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, { label: string; color: string }>>(DEFAULT_orderStatusesES);

  const fetchOrderStatuses = async () => {
    try {
      const { data } = await api.get('/settings');
      const s = data.data || data || {};
      if (s.order_statuses) {
        const arr = JSON.parse(s.order_statuses);
        const map: Record<string, { label: string; color: string }> = {};
        arr.forEach((item: any) => { if (item.key) map[item.key] = { label: item.label, color: item.color }; });
        if (Object.keys(map).length) setOrderStatuses(map);
      }
    } catch { /* use defaults */ }
  };

  useEffect(() => { fetchOrderStatuses(); }, []);

  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      const d = data.data || data;
      setOrder(d.order || d);
      setItems(d.items || []);
    } catch { navigate('/orders'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const startEditInfo = () => {
    if (!order) return;
    setInfoForm({
      shipping_method: order.shippingMethod || '',
      shipping_address: order.shippingAddress || '',
      tracking_number: order.trackingNumber || '',
      notes: order.notes || '',
      paid_amount: String(order.paidAmount || 0),
      shipping_cost: String(order.shippingCost || 0),
    });
    setEditingInfo(true);
  };

  const saveInfo = async () => {
    try {
      await api.put(`/orders/${id}`, {
        ...infoForm,
        shipping_cost: Number(infoForm.shipping_cost) || 0,
      });
      setOrder(o => o ? {
        ...o,
        shippingMethod: infoForm.shipping_method,
        shippingAddress: infoForm.shipping_address,
        trackingNumber: infoForm.tracking_number,
        notes: infoForm.notes,
        paidAmount: Number(infoForm.paid_amount) || 0,
        shippingCost: Number(infoForm.shipping_cost) || 0,
      } : o);
      setEditingInfo(false);
      fetchOrder(); // Refresh to get updated totalAmount
    } catch (err: any) { error(err.response?.data?.message || '保存失败'); }
  };

  const updateStatus = async (status: string) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      setOrder(o => o ? { ...o, status } : o);
    } catch (err: any) { error(err.response?.data?.message || '更新失败'); }
  };

  const startEditItem = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditItem({ quantity: String(item.quantity), unit_price: String(item.unitPrice), discount_pct: String(item.discountPct), package_name: item.packageName || '' });
  };

  const saveItem = async (itemId: number) => {
    try {
      await api.put(`/orders/items/${itemId}`, {
        quantity: Number(editItem.quantity),
        unit_price: Number(editItem.unit_price),
        discount_pct: Number(editItem.discount_pct),
        package_name: editItem.package_name,
      });
      setEditingItemId(null);
      fetchOrder();
    } catch (err: any) { error(err.response?.data?.message || '保存失败'); }
  };

  const deleteItem = async (itemId: number) => {
    const confirmed = await confirm({ message: '确定删除此订单项？', variant: 'danger' });
      if (!confirmed) return;
    try { await api.delete(`/orders/items/${itemId}`); fetchOrder(); } catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const handleAddPart = async (part: PartOption | null) => {
    if (!part) return;
    try {
      // Get default price
      const { data: priceData } = await api.get(`/orders/default-price/${part.id}`);
      await api.post(`/orders/${id}/items`, {
        part_id: part.id, quantity: 1, unit_price: priceData.price || 0, allow_negative: allowNegative,
      });
      // Don't hide the search box, allow continuous adding
      fetchOrder();
    } catch (err: any) { error(err.response?.data?.message || '添加失败'); }
  };

  const handlePrint = () => {
    if (!order) return;
    const statusLabel = orderStatuses[order.status]?.label || order.status;
    const pendingAmount = Number(order.totalAmount) - Number(order.paidAmount || 0);
    const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    const printContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 850px; margin: 0 auto; color: #1a1a1a; line-height: 1.5;">

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; margin-bottom: 24px; border-bottom: 3px solid #1e40af;">
          <div>
            <h1 style="font-size: 28px; font-weight: 700; color: #1e40af; margin: 0; letter-spacing: -0.5px;">ORDER</h1>
            <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">订单详情 · 内部使用</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 22px; font-weight: 700; color: #1e40af; margin: 0; font-family: monospace;">${order.orderNumber}</p>
            <div style="display: inline-block; margin-top: 6px; padding: 3px 12px; background: ${order.status === 'completed' ? '#dcfce7' : order.status === 'cancelled' ? '#fee2e2' : '#dbeafe'}; color: ${order.status === 'completed' ? '#166534' : order.status === 'cancelled' ? '#991b1b' : '#1e40af'}; border-radius: 20px; font-size: 12px; font-weight: 600;">${statusLabel}</div>
          </div>
        </div>

        <!-- Info Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <div style="width: 4px; height: 16px; background: #1e40af; border-radius: 2px;"></div>
              <h3 style="font-size: 13px; font-weight: 600; color: #475569; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">客户信息</h3>
            </div>
            <p style="margin: 6px 0; font-size: 14px;"><span style="color: #94a3b8; display: inline-block; width: 70px;">公司</span><strong>${escapeHtml(order.customer?.companyName) || '-'}</strong></p>
            <p style="margin: 6px 0; font-size: 14px;"><span style="color: #94a3b8; display: inline-block; width: 70px;">联系人</span>${escapeHtml(order.customer?.contactPerson) || '-'}</p>
            ${order.shippingAddress ? `<p style="margin: 6px 0; font-size: 14px;"><span style="color: #94a3b8; display: inline-block; width: 70px;">地址</span>${escapeHtml(order.shippingAddress)}</p>` : ''}
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <div style="width: 4px; height: 16px; background: #1e40af; border-radius: 2px;"></div>
              <h3 style="font-size: 13px; font-weight: 600; color: #475569; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">订单信息</h3>
            </div>
            <p style="margin: 6px 0; font-size: 14px;"><span style="color: #94a3b8; display: inline-block; width: 70px;">日期</span>${order.orderDate?.slice(0, 10) || '-'}</p>
            <p style="margin: 6px 0; font-size: 14px;"><span style="color: #94a3b8; display: inline-block; width: 70px;">运输</span>${escapeHtml(order.shippingMethod) || '-'}</p>
            <p style="margin: 6px 0; font-size: 14px;"><span style="color: #94a3b8; display: inline-block; width: 70px;">物流单号</span><span style="font-family: monospace;">${escapeHtml(order.trackingNumber) || '-'}</span></p>
          </div>
        </div>

        <!-- Items Table -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="width: 4px; height: 16px; background: #1e40af; border-radius: 2px;"></div>
            <h3 style="font-size: 13px; font-weight: 600; color: #475569; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">商品明细</h3>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 10px 12px; text-align: left; background: #1e40af; color: white; font-size: 12px; font-weight: 600; letter-spacing: 0.3px; border-radius: 8px 0 0 0;">OE 编号</th>
                <th style="padding: 10px 12px; text-align: left; background: #1e40af; color: white; font-size: 12px; font-weight: 600;">名称</th>
                <th style="padding: 10px 12px; text-align: left; background: #1e40af; color: white; font-size: 12px; font-weight: 600;">品牌</th>
                <th style="padding: 10px 12px; text-align: left; background: #1e40af; color: white; font-size: 12px; font-weight: 600;">包装</th>
                <th style="padding: 10px 12px; text-align: right; background: #1e40af; color: white; font-size: 12px; font-weight: 600;">数量</th>
                <th style="padding: 10px 12px; text-align: right; background: #1e40af; color: white; font-size: 12px; font-weight: 600;">单价</th>
                <th style="padding: 10px 12px; text-align: right; background: #1e40af; color: white; font-size: 12px; font-weight: 600;">小计</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr style="background: ${idx % 2 === 0 ? 'white' : '#f8fafc'};">
                  <td style="padding: 10px 12px; font-family: monospace; font-size: 13px; color: #1e40af; font-weight: 500; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.part?.oeNumber) || `#${item.partId}`}</td>
                  <td style="padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.part?.partNameCn) || '-'}</td>
                  <td style="padding: 10px 12px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.part?.brand) || '-'}</td>
                  <td style="padding: 10px 12px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.packageName) || '-'}</td>
                  <td style="padding: 10px 12px; text-align: right; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
                  <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${Number(item.unitPrice).toFixed(2)}</td>
                  <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${Number(item.subtotal).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
          <div style="width: 280px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #64748b;">
              <span>商品小计</span>
              <span style="font-family: monospace;">${order.currency} ${itemsSubtotal.toFixed(2)}</span>
            </div>
            ${Number(order.shippingCost) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #64748b;">
              <span>运费</span>
              <span style="font-family: monospace;">${order.currency} ${Number(order.shippingCost).toFixed(2)}</span>
            </div>` : ''}
            <div style="border-top: 2px solid #1e40af; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #1e40af;">
              <span>订单总额</span>
              <span style="font-family: monospace;">${order.currency} ${Number(order.totalAmount).toFixed(2)}</span>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px;">
                <span style="color: #16a34a;">✓ 已支付</span>
                <span style="font-family: monospace; color: #16a34a; font-weight: 600;">${order.currency} ${Number(order.paidAmount || 0).toFixed(2)}</span>
              </div>
              ${pendingAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; font-size: 14px;">
                <span style="color: #ea580c;">● 待支付</span>
                <span style="font-family: monospace; color: #ea580c; font-weight: 600;">${order.currency} ${pendingAmount.toFixed(2)}</span>
              </div>` : ''}
            </div>
          </div>
        </div>

        ${order.notes ? `
        <!-- Notes -->
        <div style="text-align: center; margin: 24px 0; padding: 16px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px;">
          <p style="font-size: 14px; color: #e11d48; font-weight: 600; margin: 0 0 4px 0;">备注</p>
          <p style="font-size: 14px; color: #be123c; margin: 0; white-space: pre-wrap;">${escapeHtml(order.notes)}</p>
        </div>` : ''}

        <!-- Footer -->
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
          <span>打印时间: ${new Date().toLocaleString('zh-CN')}</span>
          <span>第 1 页 / 共 1 页</span>
        </div>
      </div>
    `;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>订单 ${order.orderNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { padding: 40px; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          body { padding: 20px; }
          @page { margin: 15mm; size: A4; }
        }
      </style>
    </head><body>${printContent}</body></html>`);
    w.document.close();
    w.onload = () => { setTimeout(() => w.print(), 300); };
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }
  if (!order) return null;

  const statusOptions = Object.entries(orderStatuses).map(([key, val]) => ({ value: key, label: val.label }));
  const isPending = order.status === 'pending';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/orders')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">订单详情</h1>
          <Badge color={orderStatuses[order.status]?.color || 'gray'}>{orderStatuses[order.status]?.label || order.status}</Badge>
        </div>
        <Button variant="secondary" onClick={handlePrint}><Printer className="mr-1 h-4 w-4" /> 打印</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> 订单信息</h2>
              {!editingInfo ? (
                <button onClick={startEditInfo} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"><Pencil size={16} /></button>
              ) : (
                <div className="flex gap-1">
                  <button onClick={saveInfo} className="rounded p-1 text-green-600 hover:bg-green-50"><Check size={16} /></button>
                  <button onClick={() => setEditingInfo(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
                </div>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm text-gray-500">订单号</span>
                <p className="font-mono">{order.orderNumber}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">客户</span>
                <p>{order.customer?.companyName || `#${order.customerId}`}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">订单日期</span>
                <p>{order.orderDate?.slice(0, 10)}</p>
              </div>
              {editingInfo ? (
                <>
                  <div>
                    <span className="text-sm text-gray-500">运输方式</span>
                    <input className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-150" value={infoForm.shipping_method} onChange={(e) => setInfoForm({ ...infoForm, shipping_method: e.target.value })} />
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">物流单号</span>
                    <input className="w-full rounded border px-2 py-1 text-sm font-mono" value={infoForm.tracking_number} onChange={(e) => setInfoForm({ ...infoForm, tracking_number: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-sm text-gray-500">收货地址</span>
                    <input className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-150" value={infoForm.shipping_address} onChange={(e) => setInfoForm({ ...infoForm, shipping_address: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-sm text-gray-500">备注</span>
                    <textarea className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-150" rows={2} value={infoForm.notes} onChange={(e) => setInfoForm({ ...infoForm, notes: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <div><span className="text-sm text-gray-500">运输方式</span><p>{order.shippingMethod || '-'}</p></div>
                  <div><span className="text-sm text-gray-500">物流单号</span><p className="font-mono">{order.trackingNumber || '-'}</p></div>
                  <div className="sm:col-span-2"><span className="text-sm text-gray-500">收货地址</span><p>{order.shippingAddress || '-'}</p></div>
                  {order.notes && <div className="sm:col-span-2"><span className="text-sm text-gray-500">备注</span><p className="whitespace-pre-wrap">{order.notes}</p></div>}
                </>
              )}
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header><h2 className="text-lg font-semibold">操作</h2></Card.Header>
          <Card.Body className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">更改状态</label>
              <Select value={order.status} onChange={(e) => updateStatus(e.target.value)} options={statusOptions} />
            </div>
            <div className="border-t pt-4">
              <span className="text-sm text-gray-500">订单金额</span>
              <p className="text-2xl font-bold">{order.currency} {Number(order.totalAmount).toFixed(2)}</p>
              {Number(order.shippingCost) > 0 && (
                <p className="text-sm text-gray-500 mt-1">含运费: {order.currency} {Number(order.shippingCost).toFixed(2)}</p>
              )}
            </div>
            <div className="border-t pt-4">
              <span className="text-sm text-gray-500">运费</span>
              {editingInfo ? (
                <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 mt-1" value={infoForm.shipping_cost} onChange={(e) => setInfoForm({ ...infoForm, shipping_cost: e.target.value })} />
              ) : (
                <p className="text-xl font-semibold">{order.currency} {Number(order.shippingCost || 0).toFixed(2)}</p>
              )}
            </div>
            <div className="border-t pt-4">
              <span className="text-sm text-gray-500">已支付金额</span>
              {editingInfo ? (
                <input type="number" min="0" step="0.01" className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 mt-1" value={infoForm.paid_amount} onChange={(e) => setInfoForm({ ...infoForm, paid_amount: e.target.value })} />
              ) : (
                <p className="text-xl font-semibold text-green-600">{order.currency} {Number(order.paidAmount || 0).toFixed(2)}</p>
              )}
              {Number(order.paidAmount || 0) < Number(order.totalAmount) && (
                <p className="text-xs text-orange-500 mt-1">待付: {order.currency} {(Number(order.totalAmount) - Number(order.paidAmount || 0)).toFixed(2)}</p>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">订单商品</h2>
            {isPending && (
              <Button size="sm" variant="secondary" onClick={() => setShowAddItem(!showAddItem)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> 添加商品
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Body>
          {showAddItem && isPending && (
            <div className="mb-4 space-y-2">
              <PartPicker onSelect={handleAddPart} placeholder="输入 OE 编号或名称搜索配件..." />
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} className="rounded" />
                <span className="text-orange-600">允许负库存</span>
              </label>
            </div>
          )}
          {!items.length ? (
            <p className="py-4 text-center text-gray-500">暂无商品</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium">OE 编号</th>
                  <th className="px-4 py-3 font-medium">中文名称</th>
                  <th className="px-4 py-3 font-medium">品牌</th>
                  <th className="px-4 py-3 font-medium">包装</th>
                  <th className="px-4 py-3 font-medium text-right">数量</th>
                  <th className="px-4 py-3 font-medium text-right">单价</th>
                  <th className="px-4 py-3 font-medium text-right">折扣</th>
                  <th className="px-4 py-3 font-medium text-right">小计</th>
                  {isPending && <th className="px-4 py-3 font-medium">操作</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600">{item.part?.oeNumber || `#${item.partId}`}</td>
                    <td className="px-4 py-3">{item.part?.partNameCn || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{item.part?.brand || '-'}</td>
                    {editingItemId === item.id ? (
                      <>
                        <td className="px-4 py-2">
                          <select value={editItem.package_name} onChange={(e) => setEditItem({ ...editItem, package_name: e.target.value })}
                            className="w-20 rounded border px-1 py-1 text-xs">
                            <option value="">-</option>
                            {PACKAGE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min="1" className="w-16 rounded border px-1.5 py-1 text-right text-sm" value={editItem.quantity} onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveItem(item.id); if (e.key === 'Escape') setEditingItemId(null); }} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min="0" step="0.01" className="w-20 rounded border px-1.5 py-1 text-right text-sm" value={editItem.unit_price} onChange={(e) => setEditItem({ ...editItem, unit_price: e.target.value })} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min="0" max="100" step="1" className="w-16 rounded border px-1.5 py-1 text-right text-sm" value={editItem.discount_pct} onChange={(e) => setEditItem({ ...editItem, discount_pct: e.target.value })} />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-400">-</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => saveItem(item.id)} className="rounded p-1 text-green-600 hover:bg-green-50"><Check size={14} /></button>
                            <button onClick={() => setEditingItemId(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-gray-500 cursor-pointer hover:bg-blue-50" onClick={() => isPending && startEditItem(item)} title={isPending ? '点击编辑' : ''}>{item.packageName || '-'}</td>
                        <td className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50" onClick={() => isPending && startEditItem(item)} title={isPending ? '点击编辑' : ''}>{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono cursor-pointer hover:bg-blue-50" onClick={() => isPending && startEditItem(item)} title={isPending ? '点击编辑' : ''}>{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50" onClick={() => isPending && startEditItem(item)} title={isPending ? '点击编辑' : ''}>{item.discountPct}%</td>
                        <td className="px-4 py-3 text-right font-mono">{Number(item.subtotal).toFixed(2)}</td>
                        {isPending && (
                          <td className="px-4 py-3">
                            <button onClick={() => deleteItem(item.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="删除"><Trash2 size={14} /></button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
