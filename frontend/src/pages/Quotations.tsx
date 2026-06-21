import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye, Pencil, X, ArrowRight, Printer, Upload, Image } from 'lucide-react';
import api from '@/lib/api';
import { useCurrencies, getCurrencyName } from '@/hooks/useCurrencies';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

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

// Standalone preset status manager component to avoid cursor issues
function PresetStatusManager({ initialStatus, onClose, onSave }: {
  initialStatus: Record<string, { label: string; color: string }>;
  onClose: () => void;
  onSave: (status: Record<string, { label: string; color: string }>) => void;
}) {
  const [qStatus, setQStatus] = useState(initialStatus);
  const [newStatusKey, setNewStatusKey] = useState('');
  const [newStatusLabel, setNewLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');

  const handleAdd = () => {
    if (newStatusKey && newStatusLabel) {
      setQStatus(prev => ({ ...prev, [newStatusKey]: { label: newStatusLabel, color: newStatusColor } }));
      setNewStatusKey('');
      setNewLabel('');
    }
  };

  const handleDelete = (key: string) => {
    const next = { ...qStatus };
    delete next[key];
    setQStatus(next);
  };

  const handleSave = () => {
    onSave(qStatus);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="预设状态管理" size="md">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">管理报价单的预设状态选项，修改后自动保存</p>
        <div className="space-y-2">
          {Object.entries(qStatus).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className={`w-3 h-3 rounded-full ${
                val.color === 'gray' ? 'bg-gray-400' :
                val.color === 'blue' ? 'bg-blue-500' :
                val.color === 'green' ? 'bg-green-500' :
                val.color === 'red' ? 'bg-red-500' :
                val.color === 'yellow' ? 'bg-yellow-500' :
                val.color === 'teal' ? 'bg-teal-500' : 'bg-gray-400'
              }`} />
              <span className="flex-1 text-sm">{val.label}</span>
              <span className="text-xs text-gray-400 font-mono">{key}</span>
              {!['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'].includes(key) && (
                <button onClick={() => handleDelete(key)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newStatusKey}
            onChange={(e) => setNewStatusKey(e.target.value)}
            placeholder="英文key"
            className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
          <input
            value={newStatusLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="中文名称"
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
          <select
            value={newStatusColor}
            onChange={(e) => setNewStatusColor(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          >
            <option value="gray">灰</option>
            <option value="blue">蓝</option>
            <option value="green">绿</option>
            <option value="red">红</option>
            <option value="yellow">黄</option>
            <option value="teal">青</option>
          </select>
          <Button size="sm" onClick={handleAdd}>添加</Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}
import { Modal } from '@/components/ui/Modal';
import { PartPicker, type PartOption } from '@/components/ui/PartPicker';
import type { Quotation, QuotationItem, PaymentStage, PaymentAccount } from '@/types/quotation';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
const DEFAULT_qStatus: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'gray' },
  sent: { label: '已发送', color: 'blue' },
  accepted: { label: '已接受', color: 'green' },
  rejected: { label: '已拒绝', color: 'red' },
  expired: { label: '已过期', color: 'yellow' },
  converted: { label: '已转订单', color: 'teal' },
};

const TRADE_TERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DAP'];
const PAYMENT_METHODS = ['T/T', 'L/C', 'D/P', 'Western Union', 'PayPal', 'Cash'];
const DEFAULT_PACKAGE_OPTIONS = ['盒', '箱', '袋', '包', '件', '套', '个', '只', '对', '片', '卷', '桶', '罐'];
const UNIT_OPTIONS = ['pcs', 'sets', 'pairs', 'rolls', 'kg', 'cartons'];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CNY: '¥', AED: 'AED ', SAR: 'SAR ', RUB: '₽', JPY: '¥',
};

interface CreateItem {
  part_id: number; oe_number: string; part_name: string;
  brand: string; package_name: string; unit: string;
  quantity: number; unit_price: number;
}

const emptyForm = {
  seller_company: '', seller_contact: '', seller_phone: '', seller_email: '', seller_address: '',
  logo_url: '',
  customer_id: '', buyer_company: '', buyer_contact: '', buyer_phone: '', buyer_email: '', buyer_address: '',
  valid_until: '', currency: 'USD', trade_terms: 'FOB',
  port_loading: 'Tianjin, China', port_dest: '', delivery_time: '',
  discount_pct: '0', shipping_cost: '0',
  payment_account_id: '', notes: '', remark: '', header_text: '', footer_text: '',
  quote_prefix: 'QT', quote_middle_type: 'date', quote_middle_custom: '', quote_suffix_start: '001',
};

function generateQuoteNo(form: any, todayCount: number): string {
  const prefix = form.quote_prefix || 'QT';
  let middle = '';
  if (form.quote_middle_type === 'random') {
    middle = Math.random().toString(36).substring(2, 8).toUpperCase();
  } else if (form.quote_middle_type === 'custom') {
    middle = form.quote_middle_custom || '';
  } else {
    middle = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }
  const startNum = parseInt(form.quote_suffix_start || '1', 10);
  const suffix = String(startNum + todayCount).padStart(form.quote_suffix_start?.length || 3, '0');
  return prefix + middle + suffix;
}

export default function Quotations() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const currencies = useCurrencies();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [nextQuotationNumber, setNextQuotationNumber] = useState<string>('');

  // View mode: 'list' | 'form' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchStatus, setBatchStatus] = useState('');
  const [showBatchStatus, setShowBatchStatus] = useState(false);

  // Preset status management
  const [qStatus, setQStatus] = useState<Record<string, { label: string; color: string }>>(DEFAULT_qStatus);
  const [showStatusManager, setShowStatusManager] = useState(false);

  // Form state
  const [form, setForm] = useState(emptyForm);
  const [paymentStages, setPaymentStages] = useState<PaymentStage[]>([
    { method: 'T/T', percent: 30, description: 'Deposit' },
    { method: 'T/T', percent: 70, description: 'Before shipment' },
  ]);
  const [items, setItems] = useState<CreateItem[]>([]);
  const [packageOptions, setPackageOptions] = useState<string[]>(DEFAULT_PACKAGE_OPTIONS);
  const [showPkgManager, setShowPkgManager] = useState(false);
  const [newPkg, setNewPkg] = useState('');

  // Load package options from server on mount
  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      const settings = data.data || data || {};
      if (settings.quotation_package_options) {
        try { setPackageOptions(JSON.parse(settings.quotation_package_options)); } catch {}
      }
    }).catch(() => {});
  }, []);

  const savePackageOptions = async (opts: string[]) => {
    setPackageOptions(opts);
    try {
      await api.put('/settings/quotation_package_options', { value: JSON.stringify(opts) });
    } catch {}
  };
  const [saving, setSaving] = useState(false);

  // Customer search
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);

  // Payment accounts
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);

  // Logo file input ref
  const logoInputRef = useRef<HTMLInputElement>(null);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params: any = { page: String(page), limit: '20' };
      if (filterStatus) params.status = filterStatus;
      if (keyword) params.keyword = keyword;
      const { data } = await api.get('/quotations', { params });
      const list = Array.isArray(data) ? data : (data.items || data.data || []);
      setQuotations(list);
      setTotal(data.total || list.length || 0);
      // Count quotations created today for preview numbering
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = list.filter((q: any) => q.createdAt?.startsWith(today)).length;
      setTodayCount(todayCount);
    } catch { setQuotations([]); }
    finally { setLoading(false); }
  };

  const fetchPaymentAccounts = async () => {
    try {
      const { data } = await api.get('/quotations/payment-accounts');
      setPaymentAccounts(Array.isArray(data) ? data : data.data || []);
    } catch { /* ignore */ }
  };

  const fetchSellerInfo = async () => {
    try {
      const { data } = await api.get('/settings');
      const s = data.data || data || {};
      setForm(prev => ({
        ...prev,
        seller_company: s.seller_company || '',
        seller_contact: s.seller_contact || '',
        seller_phone: s.seller_phone || '',
        seller_email: s.seller_email || '',
        seller_address: s.seller_address || '',
      }));
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchQuotations(); }, [page, filterStatus]);
  useEffect(() => { fetchPaymentAccounts(); fetchStatusConfig(); }, []);

  const fetchStatusConfig = async () => {
    try {
      const { data } = await api.get('/settings');
      const s = data.data || data || {};
      if (s.quotation_statuses) {
        try { setQStatus(JSON.parse(s.quotation_statuses)); } catch {}
      }
    } catch {}
  };

  const saveStatusConfig = async (statuses: Record<string, { label: string; color: string }>) => {
    setQStatus(statuses);
    try {
      await api.put('/settings/quotation_statuses', { value: JSON.stringify(statuses) });
    } catch {}
  };

  const handleInlineStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.put(`/quotations/${id}/status`, { status: newStatus });
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
    } catch (err: any) {
      error(err.response?.data?.message || '状态更新失败');
    }
  };

  const searchCustomers = async (kw: string) => {
    if (!kw.trim()) { setCustomerResults([]); return; }
    try {
      const { data } = await api.get('/customers', { params: { keyword: kw, limit: '10' } });
      setCustomerResults(data.items || data.data || []);
    } catch { setCustomerResults([]); }
  };

  const selectCustomer = (c: any) => {
    setForm({
      ...form, customer_id: String(c.id),
      buyer_company: c.companyName || c.company_name || '',
      buyer_contact: c.contactPerson || c.contact_person || '',
      buyer_phone: c.phone || '', buyer_email: c.email || '',
      buyer_address: c.address || '',
    });
    setCustomerSearch(c.companyName || c.company_name || '');
    setCustomerResults([]);
  };

  // Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { success('Logo 文件不能超过 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm({ ...form, logo_url: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const openCreate = () => {
    setEditId(null); setForm(emptyForm);
    setPaymentStages([
      { method: 'T/T', percent: 30, description: 'Deposit' },
      { method: 'T/T', percent: 70, description: 'Before shipment' },
    ]);
    setItems([]); setUseExistingCustomer(false);
    setCustomerSearch(''); setCustomerResults([]);
    fetchSellerInfo();
    setNextQuotationNumber('');
    setViewMode('form');
  };

  const fetchNextQuotationNumber = async (formParams?: any) => {
    const params = formParams || form;
    try {
      const { data } = await api.get('/quotations/next-number', {
        params: {
          prefix: params.quote_prefix || 'QT',
          middle_type: params.quote_middle_type || 'date',
          middle_custom: params.quote_middle_custom || '',
          suffix_start: params.quote_suffix_start || '001',
        }
      });
      setNextQuotationNumber(data.quotationNumber || '');
    } catch {
      setNextQuotationNumber('');
    }
  };

  const openEdit = async (q: Quotation) => {
    try {
      const { data } = await api.get(`/quotations/${q.id}`);
      const d = data.data || data;
      const qt = d.quotation || d;
      setEditId(qt.id);
      setForm({
        seller_company: qt.sellerCompany || '', seller_contact: qt.sellerContact || '',
        seller_phone: qt.sellerPhone || '', seller_email: qt.sellerEmail || '',
        seller_address: qt.sellerAddress || '', logo_url: qt.logoUrl || '',
        customer_id: qt.customerId ? String(qt.customerId) : '',
        buyer_company: qt.buyerCompany || '', buyer_contact: qt.buyerContact || '',
        buyer_phone: qt.buyerPhone || '', buyer_email: qt.buyerEmail || '',
        buyer_address: qt.buyerAddress || '',
        valid_until: qt.validUntil ? qt.validUntil.slice(0, 10) : '',
        currency: qt.currency || 'USD', trade_terms: qt.tradeTerms || 'FOB',
        port_loading: qt.portLoading || '', port_dest: qt.portDest || '',
        delivery_time: qt.deliveryTime || '',
        discount_pct: String(qt.discountPct || 0), shipping_cost: String(qt.shippingCost || 0),
        payment_account_id: qt.paymentAccountId ? String(qt.paymentAccountId) : '',
        notes: qt.notes || '', remark: qt.remark || '',
        header_text: qt.headerText || '', footer_text: qt.footerText || '',
        quote_prefix: 'QT', quote_middle_type: 'date', quote_middle_custom: '', quote_suffix_start: '001',
      });
      setPaymentStages(Array.isArray(qt.paymentStages) ? qt.paymentStages : []);
      setItems((d.items || []).map((it: any) => ({
        part_id: it.partId, oe_number: it.oeNumber, part_name: it.partName,
        brand: it.brand || '', package_name: it.packageName || '', unit: it.unit || 'pcs',
        quantity: it.quantity, unit_price: Number(it.unitPrice),
      })));
      setUseExistingCustomer(false);
      setCustomerSearch(qt.buyerCompany || '');
      // Set the current quotation number for editing
      setNextQuotationNumber(qt.quotationNumber || '');
      setViewMode('form');
    } catch (err: any) { error(err.response?.data?.message || '加载失败'); }
  };

  const handleSave = async () => {
    if (items.length === 0) { success('请至少添加一个商品'); return; }
    setSaving(true);
    try {
      // If no customer selected but buyer info is filled, create a new customer first
      let customerId = form.customer_id ? Number(form.customer_id) : undefined;
      if (!customerId && form.buyer_company) {
        try {
          const { data: newCust } = await api.post('/customers', {
            company_name: form.buyer_company,
            contact_person: form.buyer_contact || '',
            phone: form.buyer_phone || '',
            email: form.buyer_email || '',
            address: form.buyer_address || '',
          });
          customerId = newCust.id;
        } catch {}
      }

      const payload = {
        ...form,
        discount_pct: Number(form.discount_pct) || 0,
        shipping_cost: Number(form.shipping_cost) || 0,
        payment_stages: paymentStages,
        payment_account_id: form.payment_account_id ? Number(form.payment_account_id) : null,
        customer_id: customerId,
        items: items.map(it => ({
          part_id: it.part_id, oe_number: it.oe_number, part_name: it.part_name,
          brand: it.brand, package_name: it.package_name, unit: it.unit,
          quantity: it.quantity, unit_price: it.unit_price,
        })),
      };
      let response;
      if (editId) {
        response = await api.put(`/quotations/${editId}`, payload);
      } else {
        response = await api.post('/quotations/generate', payload);
      }
      // Use the quotation number from backend response
      const savedQuotation = response.data?.quotation || response.data;
      if (savedQuotation?.quotationNumber) {
        success(`报价单已保存: ${savedQuotation.quotationNumber}`);
      }
      setViewMode('list');
      fetchQuotations();
    } catch (err: any) { error(err.response?.data?.message || '保存失败'); }
    finally { setSaving(false); }
  };

  // Batch operations
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === quotations.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(quotations.map(q => q.id)));
  };
  const handleBatchDelete = async () => {
    if (!selectedIds.size || !await confirm({ message: `确定删除选中的 ${selectedIds.size} 个报价单？`, variant: 'danger' })) return;
    try { await api.post('/quotations/generate', { type: 'batch-delete', ids: [...selectedIds] }); setSelectedIds(new Set()); fetchQuotations(); }
    catch (err: any) { error(err.response?.data?.message || '批量删除失败'); }
  };
  const handleBatchStatus = async () => {
    if (!selectedIds.size || !batchStatus) return;
    const ids = [...selectedIds].map(Number);
    try { await api.post('/quotations/generate', { type: 'batch-status', ids, status: batchStatus }); setSelectedIds(new Set()); setShowBatchStatus(false); setBatchStatus(''); fetchQuotations(); }
    catch (err: any) { error(err.response?.data?.message || '批量修改状态失败'); }
  };

  const handleBatchConvert = async () => {
    if (!selectedIds.size) return;
    const confirmed = await confirm({ message: `确定将选中的 ${selectedIds.size} 个报价单转为订单？`, variant: "danger" });
      if (!confirmed) return;
    let success = 0, failed = 0;
    for (const id of selectedIds) {
      try { await api.post('/quotations/generate', { type: 'convert', id: Number(id) }); success++; }
      catch { failed++; }
    }
    setSelectedIds(new Set());
    fetchQuotations();
    alert(`转订单完成：成功 ${success} 个${failed ? `，失败 ${failed} 个` : ''}`);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({ message: '确定删除此报价单？', variant: 'danger' });
      if (!confirmed) return;
    try { await api.post('/quotations/generate', { type: 'batch-delete', ids: [id] }); fetchQuotations(); }
    catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const handleStatus = async (id: number, status: string) => {
    try { await api.put(`/quotations/${id}/status`, { status }); fetchQuotations(); if (viewMode === 'detail') setViewMode('list'); }
    catch (err: any) { error(err.response?.data?.message || '更新失败'); }
  };

  const handleConvert = async (id: number) => {
    const confirmed = await confirm({ message: '确定将此报价单转为订单？', variant: 'danger' });
      if (!confirmed) return;
    try {
      const { data } = await api.post('/quotations/generate', { type: 'convert', id });
      const orderId = data.order?.id || data.data?.order?.id;
      success(`转订单成功！订单号: ${data.order?.order_number || orderId}`);
      fetchQuotations();
    } catch (err: any) { error(err.response?.data?.message || '转换失败'); }
  };

  const openDetail = async (id: number) => {
    try {
      const { data } = await api.get(`/quotations/${id}`);
      setDetailData(data.data || data);
      setViewMode('detail');
    } catch { /* ignore */ }
  };

  // Item helpers
  const handleAddPart = (part: PartOption | null) => {
    if (!part || items.some(i => i.part_id === part.id)) return;
    setItems([...items, {
      part_id: part.id, oe_number: part.oeNumber, part_name: part.partNameEn || part.partNameCn,
      brand: part.brand || '', package_name: '', unit: 'pcs', quantity: 1, unit_price: 0,
    }]);
  };
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items]; updated[idx] = { ...updated[idx], [field]: value }; setItems(updated);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  // Payment stage helpers
  const addStage = () => setPaymentStages([...paymentStages, { method: 'T/T', percent: 0, description: '' }]);
  const updateStage = (idx: number, field: string, value: any) => {
    const updated = [...paymentStages]; updated[idx] = { ...updated[idx], [field]: value }; setPaymentStages(updated);
  };
  const removeStage = (idx: number) => setPaymentStages(paymentStages.filter((_, i) => i !== idx));
  const stageTotal = paymentStages.reduce((sum, s) => sum + (Number(s.percent) || 0), 0);

  // Totals
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const discountPct = Number(form.discount_pct) || 0;
  const shippingCost = Number(form.shipping_cost) || 0;
  const totalAmount = subtotal * (1 - discountPct / 100) + shippingCost;

  const totalPages = Math.ceil(total / 20);

  // Build preview data from current form state
  const buildPreviewData = () => {
    const selectedPA = paymentAccounts.find(pa => String(pa.id) === form.payment_account_id);
    return {
      quotation: {
        quotationNumber: nextQuotationNumber || generateQuoteNo(form, todayCount),
        sellerCompany: form.seller_company, sellerContact: form.seller_contact,
        sellerPhone: form.seller_phone, sellerEmail: form.seller_email, sellerAddress: form.seller_address,
        logoUrl: form.logo_url,
        buyerCompany: form.buyer_company, buyerContact: form.buyer_contact,
        buyerPhone: form.buyer_phone, buyerEmail: form.buyer_email, buyerAddress: form.buyer_address,
        tradeTerms: form.trade_terms, portLoading: form.port_loading, portDest: form.port_dest,
        deliveryTime: form.delivery_time, validUntil: form.valid_until,
        currency: form.currency, discountPct, shippingCost, totalAmount,
        paymentStages, notes: form.notes, remark: form.remark, headerText: form.header_text, footerText: form.footer_text, status: 'draft',
        createdAt: new Date().toISOString(),
      },
      items: items.map(it => ({
        id: 0, oeNumber: it.oe_number, partName: it.part_name, brand: it.brand,
        packageName: it.package_name, unit: it.unit,
        quantity: it.quantity, unitPrice: it.unit_price,
        subtotal: it.quantity * it.unit_price,
      })),
      paymentAccount: selectedPA || null,
    };
  };

  const handlePrint = () => {
    const printContent = document.getElementById('quotation-print-area');
    if (!printContent) return;

    // Clone and remove internal notes
    const clone = printContent.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-role="internal-notes"]').forEach(el => el.remove());

    const w = window.open('', '_blank');
    if (!w) return;

    // Copy ALL style/stylelink elements from current page
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => {
        if (el.tagName === 'LINK') {
          // Convert relative URLs to absolute
          const link = el.cloneNode() as HTMLLinkElement;
          link.href = new URL(link.getAttribute('href') || '', window.location.origin).href;
          return link.outerHTML;
        }
        return el.outerHTML;
      })
      .join('\n');

    const quoteNo = detailData?.quotation?.quotationNumber || nextQuotationNumber || generateQuoteNo(form, todayCount);
    w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(quoteNo)}</title>
      ${styles}
      <style>
        html, body { margin: 0; padding: 40px; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        #print-area { max-width: 900px; margin: 0 auto; }
        @media print {
          html, body { padding: 0; }
          @page { margin: 15mm; size: A4; }
        }
      </style></head><body>
      <div id="print-area">${clone.innerHTML}</div>
    </body></html>`);
    w.document.close();
    // Trigger print after styles load
    w.onload = () => { setTimeout(() => w.print(), 300); };
  };

  // Render quotation document (shared by preview and detail)
  const renderQuotationDoc = (data: any, isPreview = false) => {
    const q = data.quotation;
    const its = data.items || [];
    const pa = data.paymentAccount;
    const sym = CURRENCY_SYMBOLS[q.currency] || q.currency + ' ';
    const docSubtotal = its.reduce((s: number, i: any) => s + Number(i.subtotal), 0);
    const docDiscount = Number(q.discountPct) || 0;
    const docShipping = Number(q.shippingCost) || 0;
    const docDate = q.createdAt ? new Date(q.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const validDate = q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

    return (
      <div id={isPreview ? 'quotation-print-area' : undefined} className="bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header with Logo */}
        <div className="flex justify-between items-start pb-5 mb-6" style={{ borderBottom: '3px solid #2563eb' }}>
          <div className="flex items-start gap-4">
            {q.logoUrl && <img src={q.logoUrl} alt="Logo" className="h-14 w-14 rounded object-contain" />}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#2563eb' }}>{q.sellerCompany || 'Company Name'}</h1>
              {q.sellerAddress && <p className="text-xs text-gray-500 mt-1">{q.sellerAddress}</p>}
              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                {q.sellerPhone && <span>Tel: {q.sellerPhone}</span>}
                {q.sellerEmail && <span>Email: {q.sellerEmail}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold tracking-widest text-gray-800">{q.headerText || 'QUOTATION'}</h2>
            <p className="text-xs text-gray-400 mt-1">PROFORMA INVOICE</p>
          </div>
        </div>

        {/* Buyer / Seller Info */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          <div className="p-3 rounded" style={{ background: '#f9fafb' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#2563eb', letterSpacing: '1px' }}>SELLER</p>
            <p className="font-semibold text-sm">{q.sellerCompany}</p>
            {q.sellerContact && <p className="text-xs text-gray-600">{q.sellerContact}</p>}
            {q.sellerPhone && <p className="text-xs text-gray-600">{q.sellerPhone}</p>}
            {q.sellerEmail && <p className="text-xs text-gray-600">{q.sellerEmail}</p>}
            {q.sellerAddress && <p className="text-xs text-gray-600">{q.sellerAddress}</p>}
          </div>
          <div className="p-3 rounded" style={{ background: '#f9fafb' }}>
            <p className="text-xs font-bold mb-2" style={{ color: '#2563eb', letterSpacing: '1px' }}>BUYER</p>
            <p className="font-semibold text-sm">{q.buyerCompany || '-'}</p>
            {q.buyerContact && <p className="text-xs text-gray-600">{q.buyerContact}</p>}
            {q.buyerPhone && <p className="text-xs text-gray-600">{q.buyerPhone}</p>}
            {q.buyerEmail && <p className="text-xs text-gray-600">{q.buyerEmail}</p>}
            {q.buyerAddress && <p className="text-xs text-gray-600">{q.buyerAddress}</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Quote No.', value: q.quotationNumber },
            { label: 'Date', value: docDate },
            { label: 'Valid Until', value: validDate },
            { label: 'Currency', value: q.currency },
          ].map(m => (
            <div key={m.label} className="text-center p-2 rounded" style={{ background: '#f3f4f6' }}>
              <p className="text-xs text-gray-500 uppercase">{m.label}</p>
              <p className="text-sm font-bold">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Trade Terms', value: q.tradeTerms || '-' },
            { label: 'Loading Port', value: q.portLoading || '-' },
            { label: 'Destination', value: q.portDest || '-' },
            { label: 'Delivery', value: q.deliveryTime || '-' },
          ].map(m => (
            <div key={m.label} className="text-center p-2 rounded" style={{ background: '#f3f4f6' }}>
              <p className="text-xs text-gray-500 uppercase">{m.label}</p>
              <p className="text-sm font-bold">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Product Table */}
        <table className="w-full mb-5" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#2563eb', color: 'white' }}>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase">OE No.</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase">Product Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase">Package</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase">Unit</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase">Qty</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase">Unit Price</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {its.map((item: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 ? '#f9fafb' : 'white' }}>
                <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                <td className="px-3 py-2 text-xs font-mono text-blue-600 whitespace-nowrap">{item.oeNumber}</td>
                <td className="px-3 py-2 text-xs">{item.partName}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{item.packageName || '-'}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{item.unit || 'pcs'}</td>
                <td className="px-3 py-2 text-xs text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-xs text-right font-mono">{sym}{Number(item.unitPrice).toFixed(2)}</td>
                <td className="px-3 py-2 text-xs text-right font-mono">{sym}{Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="w-72 ml-auto mb-5">
          <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">Subtotal</span><span className="font-mono">{sym}{docSubtotal.toFixed(2)}</span></div>
          {docDiscount > 0 && <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">Discount ({docDiscount}%)</span><span className="font-mono">-{sym}{(docSubtotal * docDiscount / 100).toFixed(2)}</span></div>}
          {docShipping > 0 && <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">Shipping ({q.tradeTerms || 'FOB'})</span><span className="font-mono">{sym}{docShipping.toFixed(2)}</span></div>}
          <div className="flex justify-between py-2 text-lg font-bold" style={{ borderTop: '2px solid #333' }}><span>TOTAL</span><span className="font-mono">{sym}{Number(q.totalAmount).toFixed(2)}</span></div>
        </div>

        {/* Payment Stages & Account */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          {q.paymentStages?.length > 0 && (
            <div className="p-3 rounded" style={{ background: '#f9fafb' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#2563eb', letterSpacing: '1px' }}>PAYMENT TERMS</p>
              {q.paymentStages.map((s: PaymentStage, i: number) => (
                <p key={i} className="text-xs text-gray-700 mb-1">{s.method} {s.percent}% ({sym}{(Number(q.totalAmount) * (s.percent || 0) / 100).toFixed(2)}) - {s.description}</p>
              ))}
            </div>
          )}
          {pa && (
            <div className="p-3 rounded" style={{ background: '#f9fafb' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#2563eb', letterSpacing: '1px' }}>BANK DETAILS</p>
              {pa.beneficiaryName && <p className="text-xs text-gray-700">Beneficiary: {pa.beneficiaryName}</p>}
              {pa.bankName && <p className="text-xs text-gray-700">Bank: {pa.bankName}</p>}
              {pa.bankAddress && <p className="text-xs text-gray-700">Bank Address: {pa.bankAddress}</p>}
              {pa.swiftCode && <p className="text-xs text-gray-700 font-mono">SWIFT: {pa.swiftCode}</p>}
              {pa.accountNumber && <p className="text-xs text-gray-700 font-mono">Account: {pa.accountNumber}</p>}
              {pa.accountType && <p className="text-xs text-gray-700">Account Type: {pa.accountType}</p>}
              {pa.bankCode && <p className="text-xs text-gray-700 font-mono">Bank Code: {pa.bankCode}</p>}
              {pa.branchCode && <p className="text-xs text-gray-700 font-mono">Branch Code: {pa.branchCode}</p>}
              {pa.remark && <p className="text-xs text-gray-500 mt-1 italic">{pa.remark}</p>}
            </div>
          )}
        </div>

        {/* Remark */}
        {q.remark && (
          <div className="p-3 rounded mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#92400e' }}>REMARK</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{q.remark}</p>
          </div>
        )}

        {/* Notes - Internal, hidden in print */}
        {q.notes && (
          <div data-role="internal-notes" className="p-3 rounded mb-5" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#92400e' }}>NOTES</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{q.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 text-xs text-gray-400" style={{ borderTop: '1px solid #e5e7eb' }}>
          {q.footerText ? (
            <p className="whitespace-pre-wrap">{q.footerText}</p>
          ) : (
            <>
              <p>This quotation is valid until {validDate}. Prices are subject to change after the expiry date.</p>
              {q.sellerCompany && <p className="mt-1">{q.sellerCompany} | {q.sellerPhone || ''} | {q.sellerEmail || ''}</p>}
            </>
          )}
        </div>
      </div>
    );
  };

  // ==================== LIST VIEW ====================
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">报价单</h1>
          <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> 新建报价单</Button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
            <span className="text-sm text-blue-700">已选 {selectedIds.size} 项</span>
            <Button size="sm" variant="secondary" onClick={handleBatchDelete}><Trash2 className="mr-1 h-3.5 w-3.5" /> 批量删除</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowBatchStatus(true)}><Pencil className="mr-1 h-3.5 w-3.5" /> 批量修改状态</Button>
            <Button size="sm" variant="secondary" onClick={handleBatchConvert}><ArrowRight className="mr-1 h-3.5 w-3.5" /> 批量转订单</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
          </div>
        )}

        {/* Filters */}
        <Card>
          <Card.Body>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Input placeholder="搜索报价号、客户..." value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchQuotations(); } }} />
              </div>
              <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                options={[{ value: '', label: '全部状态' }, ...Object.entries(qStatus).map(([k, v]) => ({ value: k, label: v.label }))]} />
              <Button variant="secondary" onClick={() => { setKeyword(''); setFilterStatus(''); setPage(1); }}>重置</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowStatusManager(true)} title="管理预设状态"><Pencil size={14} /></Button>
            </div>
          </Card.Body>
        </Card>

        {/* List */}
        <Card>
          <Card.Body>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : quotations.length === 0 ? (
              <p className="py-12 text-center text-gray-500">暂无报价单</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="w-10 px-4 py-3"><input type="checkbox" checked={selectedIds.size === quotations.length && quotations.length > 0} onChange={toggleSelectAll} /></th>
                    <th className="px-4 py-3 font-medium">报价号</th>
                    <th className="px-4 py-3 font-medium">客户</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium text-right">金额</th>
                    <th className="px-4 py-3 font-medium">有效期至</th>
                    <th className="px-4 py-3 font-medium">创建时间</th>
                    <th className="px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleSelect(q.id)} /></td>
                      <td className="px-4 py-3 font-mono text-blue-600">{q.quotationNumber}</td>
                      <td className="px-4 py-3">{q.buyerCompany || q.customerName || (q.customerId ? `Customer #${q.customerId}` : '-')}</td>
                      <td className="px-4 py-3">
                        <select
                          className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${
                            q.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                            q.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            q.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            q.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            q.status === 'expired' ? 'bg-yellow-100 text-yellow-700' :
                            q.status === 'converted' ? 'bg-teal-100 text-teal-700' :
                            'bg-gray-100 text-gray-700'
                          }`}
                          value={q.status}
                          onChange={(e) => handleInlineStatusChange(q.id, e.target.value)}
                        >
                          {Object.entries(qStatus).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{q.currency} {Number(q.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3">{q.validUntil ? q.validUntil.slice(0, 10) : '-'}</td>
                      <td className="px-4 py-3">{q.createdAt?.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openDetail(q.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="查看"><Eye size={14} /></button>
                          <button onClick={() => openEdit(q)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="编辑"><Pencil size={14} /></button>
                          {q.status !== 'converted' && (
                            <button onClick={() => handleConvert(q.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600" title="转为订单"><ArrowRight size={14} /></button>
                          )}
                          <button onClick={() => handleDelete(q.id)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="删除"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">共 {total} 条</span>
                <div className="flex gap-2 items-center">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                  <span className="text-sm">{page} / {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Batch Status Modal */}
        <Modal isOpen={showBatchStatus} onClose={() => { setShowBatchStatus(false); setBatchStatus(''); }} title={`批量修改状态 (${selectedIds.size} 项)`} size="sm">
          <div className="space-y-4">
            <select className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm" value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)}>
              <option value="">选择目标状态</option>
              {Object.entries(qStatus).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowBatchStatus(false); setBatchStatus(''); }}>取消</Button>
              <Button onClick={handleBatchStatus} disabled={!batchStatus}>确认修改</Button>
            </div>
          </div>
        </Modal>

        {/* Preset Status Manager Modal */}
        {showStatusManager && (
          <PresetStatusManager
            initialStatus={qStatus}
            onClose={() => setShowStatusManager(false)}
            onSave={(newStatus) => saveStatusConfig(newStatus)}
          />
        )}
      </div>
    );
  }

  // ==================== FORM VIEW (Split Panel) ====================
  if (viewMode === 'form') {
    return (
      <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setViewMode('list')}>
              &larr; 返回列表
            </Button>
            <h1 className="text-xl font-bold">{editId ? '编辑报价单' : '新建报价单'}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="mr-1 h-4 w-4" /> {showPreview ? '隐藏预览' : '实时预览'}
            </Button>
            <Button variant="secondary" onClick={() => setViewMode('list')}>取消</Button>
            <Button onClick={handleSave} disabled={saving || items.length === 0}>
              {saving ? '保存中...' : editId ? '更新' : `创建 (${items.length} 项)`}
            </Button>
          </div>
        </div>

        <div className={`grid gap-4 ${showPreview ? 'grid-cols-[1fr_420px]' : 'grid-cols-1'}`}>
          {/* LEFT: Form */}
          <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
            {/* Seller Info */}
            <Card>
              <Card.Body>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">卖方信息</h3>
                {/* Logo Upload */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 block mb-1">公司 Logo</label>
                  <div className="flex items-center gap-3">
                    {form.logo_url ? (
                      <div className="relative">
                        <img src={form.logo_url} alt="Logo" className="h-16 w-16 rounded border object-contain" />
                        <button onClick={() => setForm({ ...form, logo_url: '' })} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">&times;</button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 bg-gray-50/50">
                        <Image size={20} />
                      </div>
                    )}
                    <div>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <Button variant="ghost" size="sm" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="mr-1 h-3 w-3" /> 上传 Logo
                      </Button>
                      <p className="text-xs text-gray-400 mt-1">支持 JPG/PNG，最大 2MB</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="公司名称" value={form.seller_company} onChange={(e) => setForm({ ...form, seller_company: e.target.value })} />
                  <Input label="联系人" value={form.seller_contact} onChange={(e) => setForm({ ...form, seller_contact: e.target.value })} />
                  <Input label="电话" value={form.seller_phone} onChange={(e) => setForm({ ...form, seller_phone: e.target.value })} />
                  <Input label="邮箱" value={form.seller_email} onChange={(e) => setForm({ ...form, seller_email: e.target.value })} />
                  <div className="col-span-2"><Input label="地址" value={form.seller_address} onChange={(e) => setForm({ ...form, seller_address: e.target.value })} /></div>
                </div>
              </Card.Body>
            </Card>

            {/* Buyer Info */}
            <Card>
              <Card.Body>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">买方信息</h3>
                <label className="flex items-center gap-2 mb-3">
                  <input type="checkbox" checked={useExistingCustomer} onChange={(e) => {
                    setUseExistingCustomer(e.target.checked);
                    if (!e.target.checked) { setForm({ ...form, customer_id: '' }); setCustomerSearch(''); }
                  }} className="rounded w-4 h-4" />
                  <span className="text-sm">从客户列表选择</span>
                </label>
                {useExistingCustomer ? (
                  <div className="relative">
                    <Input placeholder="搜索客户名称..." value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); searchCustomers(e.target.value); }} />
                    {customerResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded border bg-white shadow">
                        {customerResults.map((c: any) => (
                          <button key={c.id} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                            onClick={() => selectCustomer(c)}>
                            {c.companyName || c.company_name} - {c.contactPerson || c.contact_person || ''}
                          </button>
                        ))}
                      </div>
                    )}
                    {form.customer_id && <p className="mt-1 text-xs text-green-600">已选择客户: {form.buyer_company || `#${form.customer_id}`}</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="公司名称" value={form.buyer_company} onChange={(e) => setForm({ ...form, buyer_company: e.target.value })} />
                    <Input label="联系人" value={form.buyer_contact} onChange={(e) => setForm({ ...form, buyer_contact: e.target.value })} />
                    <Input label="电话" value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} />
                    <Input label="邮箱" value={form.buyer_email} onChange={(e) => setForm({ ...form, buyer_email: e.target.value })} />
                    <div className="col-span-2"><Input label="地址" value={form.buyer_address} onChange={(e) => setForm({ ...form, buyer_address: e.target.value })} /></div>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Quote Meta */}
            <Card>
              <Card.Body>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">报价信息</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="有效期至" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                  <Select label="币种" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    options={currencies.map(c => ({ value: c, label: `${c} - ${getCurrencyName(c)}` }))} />
                  <Select label="贸易条款" value={form.trade_terms} onChange={(e) => setForm({ ...form, trade_terms: e.target.value })}
                    options={TRADE_TERMS.map(t => ({ value: t, label: t }))} />
                  <Input label="装运港" value={form.port_loading} onChange={(e) => setForm({ ...form, port_loading: e.target.value })} />
                  <Input label="目的港" value={form.port_dest} onChange={(e) => setForm({ ...form, port_dest: e.target.value })} />
                  <Input label="交货期" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} />
                </div>
              </Card.Body>
            </Card>

            {/* Payment Stages */}
            <Card>
              <Card.Body>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">付款方式</h3>
                <div className="space-y-2">
                  {paymentStages.map((stage, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select value={stage.method} onChange={(e) => updateStage(idx, 'method', e.target.value)}
                        options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" max="100" value={stage.percent}
                          onChange={(e) => updateStage(idx, 'percent', Number(e.target.value))}
                          className="w-16 rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-right text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                        <span className="text-sm text-gray-500">%</span>
                        <span className="text-xs text-blue-600 font-mono">({form.currency} {(totalAmount * (stage.percent || 0) / 100).toFixed(2)})</span>
                      </div>
                      <input type="text" value={stage.description} placeholder="说明"
                        onChange={(e) => updateStage(idx, 'description', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                      <button onClick={() => removeStage(idx)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={addStage}><Plus className="mr-1 h-3 w-3" /> 添加阶段</Button>
                    <span className={`text-sm font-medium ${stageTotal === 100 ? 'text-green-600' : 'text-red-500'}`}>
                      合计: {stageTotal}%
                    </span>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Product Table */}
            <Card>
              <Card.Body>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">商品明细</h3>
                <div className="flex gap-2">
                  <div className="flex-1"><PartPicker onSelect={handleAddPart} placeholder="搜索OE号或配件名称..." /></div>
                  <Button variant="secondary" size="sm" onClick={() => setShowPkgManager(true)} title="管理包装选项">包装</Button>
                </div>
                {items.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left">
                          <th className="px-3 py-2 font-medium">#</th>
                          <th className="px-3 py-2 font-medium whitespace-nowrap">OE号</th>
                          <th className="px-3 py-2 font-medium">名称</th>
                          <th className="px-3 py-2 font-medium whitespace-nowrap">品牌</th>
                          <th className="px-3 py-2 font-medium">包装</th>
                          <th className="px-3 py-2 font-medium">单位</th>
                          <th className="px-3 py-2 font-medium text-right">数量</th>
                          <th className="px-3 py-2 font-medium text-right">单价</th>
                          <th className="px-3 py-2 font-medium text-right">小计</th>
                          <th className="px-3 py-2 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2 font-mono text-blue-600 whitespace-nowrap">{item.oe_number}</td>
                            <td className="px-3 py-2">{item.part_name}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{item.brand}</td>
                            <td className="px-3 py-2">
                              <select value={item.package_name} onChange={(e) => updateItem(idx, 'package_name', e.target.value)}
                                className="w-20 rounded-lg border border-gray-200 bg-gray-50/50 px-1 py-1 text-xs focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                                <option value="">-</option>
                                {packageOptions.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                className="rounded-lg border border-gray-200 bg-gray-50/50 px-1.5 py-1 text-xs focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input type="number" min="1" value={item.quantity}
                                onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                className="w-16 rounded-lg border border-gray-200 bg-gray-50/50 px-1.5 py-1 text-right text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input type="number" min="0" step="0.01" value={item.unit_price}
                                onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                                className="w-20 rounded-lg border border-gray-200 bg-gray-50/50 px-1.5 py-1 text-right text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{(item.quantity * item.unit_price).toFixed(2)}</td>
                            <td className="px-3 py-2">
                              <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-gray-50">
                          <td colSpan={8} className="px-3 py-2 text-right text-sm">小计</td>
                          <td className="px-3 py-2 text-right font-mono">{form.currency} {subtotal.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Input label="折扣 (%)" type="number" min="0" max="100" value={form.discount_pct}
                    onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} />
                  <Input label="运费" type="number" min="0" step="0.01" value={form.shipping_cost}
                    onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} />
                  <div>
                    <span className="text-sm text-gray-500">合计</span>
                    <p className="text-xl font-bold font-mono">{form.currency} {totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Notes & Remark */}
            <Card>
              <Card.Body>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">页眉 / 页脚 / 备注</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">报价单编号</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">前缀</label>
                        <input value={form.quote_prefix} onChange={(e) => {
                          const newForm = { ...form, quote_prefix: e.target.value };
                          setForm(newForm);
                          if (!editId) fetchNextQuotationNumber(newForm);
                        }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="QT" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">中段</label>
                        <select value={form.quote_middle_type} onChange={(e) => {
                          const newForm = { ...form, quote_middle_type: e.target.value };
                          setForm(newForm);
                          if (!editId) fetchNextQuotationNumber(newForm);
                        }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                          <option value="date">当前日期</option>
                          <option value="random">随机</option>
                          <option value="custom">自定义</option>
                        </select>
                        {form.quote_middle_type === 'custom' && (
                          <input value={form.quote_middle_custom} onChange={(e) => {
                            const newForm = { ...form, quote_middle_custom: e.target.value };
                            setForm(newForm);
                            if (!editId) fetchNextQuotationNumber(newForm);
                          }}
                            className="w-full mt-1 rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="自定义中段" />
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">起始序号</label>
                        <input value={form.quote_suffix_start} onChange={(e) => {
                          const newForm = { ...form, quote_suffix_start: e.target.value };
                          setForm(newForm);
                          if (!editId) fetchNextQuotationNumber(newForm);
                        }}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="001" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {nextQuotationNumber && !editId ? (
                        <>下一个报价号: <span className="font-mono text-blue-600">{nextQuotationNumber}</span></>
                      ) : (
                        <>示例: {form.quote_prefix || 'QT'}{form.quote_middle_type === 'date' ? new Date().toISOString().slice(0,10).replace(/-/g,'') : form.quote_middle_type === 'random' ? 'A3F8K2' : (form.quote_middle_custom || 'XXXXXX')}{form.quote_suffix_start || '001'}</>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">页眉标题</label>
                    <input value={form.header_text} onChange={(e) => setForm({ ...form, header_text: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="默认: QUOTATION" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">页脚文字</label>
                    <textarea value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" rows={2} placeholder="留空使用默认页脚" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">附言 / Remark</label>
                    <textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" rows={2} placeholder="Remark shown on quotation..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">内部备注 / Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" rows={2} placeholder="Internal notes (not shown on print)..." />
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Payment Account */}
            <Card>
              <Card.Body>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 border-b pb-2">付款账户</h3>
                <Select label="选择付款账户" value={form.payment_account_id}
                  onChange={(e) => setForm({ ...form, payment_account_id: e.target.value })}
                  options={[{ value: '', label: '无' }, ...paymentAccounts.map(pa => ({ value: String(pa.id), label: `${pa.accountName} (${pa.currency})` }))]} />
              </Card.Body>
            </Card>
          </div>

          {/* RIGHT: Live Preview */}
          {showPreview && (
            <div className="sticky top-4 max-h-[calc(100vh-140px)] overflow-y-auto rounded-xl bg-white p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">实时预览</h3>
                <Button variant="ghost" size="sm" onClick={handlePrint} disabled={items.length === 0}>
                  <Printer className="mr-1 h-3 w-3" /> 打印
                </Button>
              </div>
              <div className="rounded-xl shadow-sm overflow-hidden" style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: '181.8%', height: '181.8%' }}>
                {renderQuotationDoc(buildPreviewData(), true)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Package Options Manager */}
      <Modal isOpen={showPkgManager} onClose={() => setShowPkgManager(false)} title="管理包装选项" size="sm">
        <div className="space-y-3">
          <p className="text-xs text-gray-500">预设包装选项，选择商品时可直接下拉选择</p>
          <div className="space-y-1">
            {packageOptions.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm px-2 py-1 bg-gray-50 rounded">{p}</span>
                <button onClick={() => savePackageOptions(packageOptions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newPkg} onChange={(e) => setNewPkg(e.target.value)} placeholder="新增包装名称"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm" onKeyDown={(e) => {
                if (e.key === 'Enter' && newPkg.trim()) { savePackageOptions([...packageOptions, newPkg.trim()]); setNewPkg(''); }
              }} />
            <Button size="sm" onClick={() => { if (newPkg.trim()) { savePackageOptions([...packageOptions, newPkg.trim()]); setNewPkg(''); } }}>添加</Button>
          </div>
          <div className="flex justify-end"><Button variant="secondary" onClick={() => setShowPkgManager(false)}>关闭</Button></div>
        </div>
      </Modal>
    </>
    );
  }

  // ==================== DETAIL VIEW ====================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setViewMode('list')}>
            &larr; 返回列表
          </Button>
          <h1 className="text-xl font-bold">报价单详情</h1>
          {detailData?.quotation && (
            <Badge color={qStatus[detailData.quotation.status]?.color || 'gray'}>
              {qStatus[detailData.quotation.status]?.label || detailData.quotation.status}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {detailData?.quotation?.status === 'draft' && (
            <Button size="sm" onClick={() => handleStatus(detailData.quotation.id, 'sent')}>标记为已发送</Button>
          )}
          {detailData?.quotation?.status === 'sent' && (
            <>
              <Button size="sm" onClick={() => handleStatus(detailData.quotation.id, 'accepted')}>标记为已接受</Button>
              <Button size="sm" variant="danger" onClick={() => handleStatus(detailData.quotation.id, 'rejected')}>标记为已拒绝</Button>
            </>
          )}
          {detailData?.quotation?.status === 'accepted' && (
            <Button size="sm" onClick={() => handleConvert(detailData.quotation.id)}>
              <ArrowRight className="mr-1 h-3.5 w-3.5" /> 转为订单
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="mr-1 h-3.5 w-3.5" /> 打印 / PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {
            if (detailData?.quotation) openEdit(detailData.quotation);
          }}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
          </Button>
        </div>
      </div>

      {detailData ? (
        <Card>
          <Card.Body>
            {renderQuotationDoc(detailData, true)}
          </Card.Body>
        </Card>
      ) : (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
