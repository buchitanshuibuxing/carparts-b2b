import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Copy, Check, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { PaymentAccount } from '@/types/quotation';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
const CARD_GRADIENTS = [
  'from-blue-600 to-blue-800',
  'from-purple-600 to-purple-800',
  'from-emerald-600 to-emerald-800',
  'from-orange-500 to-orange-700',
  'from-pink-500 to-pink-700',
  'from-cyan-600 to-cyan-800',
];

// Separate form component to avoid re-render issues
function PaymentAccountForm({ initialData, onSave, onCancel, saving }: {
  initialData: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const currencies = useCurrencies();
  const [form, setForm] = useState(initialData);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">账户名称</label>
        <input value={form.account_name} onChange={(e) => handleChange('account_name', e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="如：美元主账户" />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">收款公司</label>
        <input value={form.beneficiary_name} onChange={(e) => handleChange('beneficiary_name', e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Beneficiary Name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">银行名称</label>
          <input value={form.bank_name} onChange={(e) => handleChange('bank_name', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Bank Name" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">SWIFT Code</label>
          <input value={form.swift_code} onChange={(e) => handleChange('swift_code', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="SWIFT/BIC Code" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">银行地址</label>
        <input value={form.bank_address} onChange={(e) => handleChange('bank_address', e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Bank Address" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">账户类型</label>
          <input value={form.account_type} onChange={(e) => handleChange('account_type', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Savings/Checking" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">银行代码</label>
          <input value={form.bank_code} onChange={(e) => handleChange('bank_code', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Bank Code" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">支行代码</label>
          <input value={form.branch_code} onChange={(e) => handleChange('branch_code', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Branch Code" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">账号 / IBAN</label>
          <input value={form.account_number} onChange={(e) => handleChange('account_number', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Account No. / IBAN" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">收款币种</label>
          <select value={form.currency} onChange={(e) => handleChange('currency', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">附言 / 备注</label>
        <input value={form.remark} onChange={(e) => handleChange('remark', e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="Please include the Quote No. in the payment reference" />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.is_default} onChange={(e) => handleChange('is_default', e.target.checked)} className="rounded w-4 h-4" />
        <span className="text-sm font-medium">设为默认账户</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button onClick={() => onSave(form)} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-1 opacity-60 hover:opacity-100 transition-opacity" title="复制">
      {copied ? <Check size={12} className="text-green-300" /> : <Copy size={12} className="text-white/70" />}
    </button>
  );
}

const emptyForm = {
  account_name: '', beneficiary_name: '', bank_name: '', bank_address: '',
  swift_code: '', account_number: '', account_type: '', bank_code: '', branch_code: '',
  currency: 'USD', remark: '', is_default: false,
};

export default function PaymentAccounts() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formInitial, setFormInitial] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const { data: res } = await api.get('/quotations/payment-accounts');
      setData(Array.isArray(res) ? res : res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditId(null);
    setFormInitial(emptyForm);
    setShowForm(true);
  };

  const openEdit = (pa: PaymentAccount) => {
    setEditId(pa.id);
    setFormInitial({
      account_name: pa.accountName, beneficiary_name: pa.beneficiaryName,
      bank_name: pa.bankName, bank_address: pa.bankAddress,
      swift_code: pa.swiftCode, account_number: pa.accountNumber,
      account_type: pa.accountType || '', bank_code: pa.bankCode || '', branch_code: pa.branchCode || '',
      currency: pa.currency, remark: pa.remark, is_default: pa.isDefault,
    });
    setShowForm(true);
  };

  const handleSave = async (formData: any) => {
    if (!formData.account_name?.trim()) { success('请输入账户名称'); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/quotations/payment-accounts/${editId}`, formData);
      } else {
        await api.post('/quotations/payment-accounts', formData);
      }
      setShowForm(false);
      fetchData();
    } catch (err: any) { error(err.response?.data?.message || '保存失败'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({ message: '确定删除此付款账户？', variant: 'danger' });
      if (!confirmed) return;
    try { await api.delete(`/quotations/payment-accounts/${id}`); fetchData(); }
    catch (err: any) { error(err.response?.data?.message || '删除失败'); }
  };

  const formatAccountNumber = (num: string) => {
    if (!num) return '';
    return num.replace(/(.{4})/g, '$1 ').trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">付款信息</h1>
          <p className="text-sm text-gray-500 mt-1">管理收款账户，用于报价单和订单</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> 新建账户</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <Card.Body>
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <CreditCard size={48} className="mb-4" />
              <p className="text-lg font-medium">暂无付款账户</p>
              <p className="text-sm mt-1">点击「新建账户」添加您的收款银行信息</p>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-2">
          {data.map((pa, idx) => {
            const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
            return (
              <div key={pa.id} className={`relative rounded-2xl p-5 text-white bg-gradient-to-br ${gradient} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                {pa.isDefault && (
                  <div className="absolute top-4 right-14">
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">默认</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-1">
                  <button onClick={() => openEdit(pa)} className="rounded-full p-1.5 hover:bg-white/20 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(pa.id)} className="rounded-full p-1.5 hover:bg-white/20 transition-colors"><Trash2 size={14} /></button>
                </div>

                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xs font-bold tracking-widest opacity-80">{pa.currency}</span>
                  {pa.accountType && <span className="text-xs opacity-60">· {pa.accountType}</span>}
                </div>

                <div className="flex items-center gap-2 mb-5">
                  <p className="text-xl font-mono tracking-wider font-medium">{formatAccountNumber(pa.accountNumber)}</p>
                  {pa.accountNumber && <CopyButton text={pa.accountNumber} />}
                </div>

                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    {pa.beneficiaryName && (
                      <div>
                        <p className="text-[10px] uppercase opacity-60 tracking-wider">Beneficiary</p>
                        <p className="text-sm font-medium">{pa.beneficiaryName}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {pa.bankName && (
                        <div>
                          <p className="text-[10px] uppercase opacity-60 tracking-wider">Bank</p>
                          <p className="text-xs">{pa.bankName}</p>
                        </div>
                      )}
                      {pa.swiftCode && (
                        <div>
                          <p className="text-[10px] uppercase opacity-60 tracking-wider">SWIFT</p>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-mono">{pa.swiftCode}</p>
                            <CopyButton text={pa.swiftCode} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold opacity-90">{pa.accountName}</p>
                  </div>
                </div>

                {(pa.bankCode || pa.branchCode) && (
                  <div className="mt-3 pt-3 border-t border-white/20 flex gap-4 text-[10px]">
                    {pa.bankCode && <span>Bank Code: {pa.bankCode}</span>}
                    {pa.branchCode && <span>Branch Code: {pa.branchCode}</span>}
                  </div>
                )}

                {pa.remark && (
                  <div className="mt-2 text-[10px] opacity-60 italic truncate">{pa.remark}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editId ? '编辑付款账户' : '新建付款账户'} size="lg">
        <PaymentAccountForm
          key={editId || 'new'}
          initialData={formInitial}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      </Modal>
    </div>
  );
}
