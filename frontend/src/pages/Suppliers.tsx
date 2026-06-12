import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FormModal } from '@/components/ui/FormModal';
import api from '@/lib/api';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
const CREATE_FIELDS = [
  { name: 'supplier_code', label: '供应商编号', required: true },
  { name: 'company_name', label: '公司名称', required: true },
  { name: 'contact_person', label: '联系人' },
  { name: 'phone', label: '电话' },
  { name: 'email', label: '邮箱', type: 'email' as const },
  { name: 'country', label: '国家' },
  { name: 'main_products', label: '主营产品' },
];

const EMPTY_FORM = { supplier_code: '', company_name: '', contact_person: '', phone: '', email: '', country: '', main_products: '' };

export default function Suppliers() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<any>({ items: [], total: 0, page: 1, page_size: 20 });
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  // Batch operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchForm, setBatchForm] = useState({ company_name: '', contact_person: '', phone: '', email: '', country: '', main_products: '', payment_terms: '', currency: '', lead_time_days: '', rating: '', notes: '' });
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number; success: number; failed: number; errors: string[]; running: boolean } | null>(null);

  const fetchData = async () => {
    const { data: res } = await api.get('/suppliers', { params: { page, page_size: 20 } });
    setData(res.data || res);
    setSelectedIds(new Set());
  };
  useEffect(() => { fetchData(); }, [page]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    const items = data.items || [];
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i: any) => i.id)));
  };

  const handleBatchEdit = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const body: any = { ids };
    const fieldMap: Record<string, string> = {
      company_name: 'company_name', contact_person: 'contact_person', phone: 'phone', email: 'email',
      country: 'country', main_products: 'main_products', payment_terms: 'payment_terms',
      currency: 'currency', lead_time_days: 'lead_time_days', rating: 'rating', notes: 'notes',
    };
    for (const [k, v] of Object.entries(batchForm)) {
      if (v) body[fieldMap[k] || k] = v;
    }
    if (Object.keys(body).length <= 1) { success('请填写至少一个修改项'); return; }
    setShowBatchEdit(false);
    try {
      const { data } = await api.post('/suppliers/batch-update', body);
      setBatchProgress({ total: ids.length, done: ids.length, success: data.updated || ids.length, failed: 0, errors: [], running: false });
    } catch (err: any) {
      setBatchProgress({ total: ids.length, done: ids.length, success: 0, failed: ids.length, errors: [err.response?.data?.message || '批量更新失败'], running: false });
    }
    setBatchForm({ company_name: '', contact_person: '', phone: '', email: '', country: '', main_products: '', payment_terms: '', currency: '', lead_time_days: '', rating: '', notes: '' });
    fetchData();
  };

  const handleBatchDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const confirmed = await confirm({ message: `确定删除选中的 ${ids.length} 个供应商？`, variant: "danger" });
      if (!confirmed) return;
    try {
      const { data } = await api.post('/suppliers/batch-delete', { ids });
      setBatchProgress({ total: ids.length, done: ids.length, success: data.deleted || ids.length, failed: 0, errors: [], running: false });
    } catch (err: any) {
      setBatchProgress({ total: ids.length, done: ids.length, success: 0, failed: ids.length, errors: [err.response?.data?.message || '批量删除失败'], running: false });
    }
    fetchData();
  };

  const columns = [
    { key: 'supplierCode', title: '编号' },
    { key: 'companyName', title: '公司名称' },
    { key: 'contactPerson', title: '联系人' },
    { key: 'phone', title: '电话' },
    { key: 'country', title: '国家' },
    { key: 'mainProducts', title: '主营产品', render: (r: any) => <span className="text-gray-600">{r.mainProducts || '-'}</span> },
    { key: 'rating', title: '评级', render: (r: any) => '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) },
    { key: 'isActive', title: '状态', render: (r: any) => <Badge color={r.isActive ? 'green' : 'red'}>{r.isActive ? '合作' : '停用'}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">供应商管理</h1>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" />新建</Button>
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

      <div className="bg-white rounded-xl border border-gray-200">
        <Table
          columns={columns}
          data={data.items || []}
          keyField="id"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
        />
        <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
      </div>

      {/* Create Modal */}
      <FormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="新建供应商"
        fields={CREATE_FIELDS}
        initialValues={EMPTY_FORM}
        onSubmit={async (values) => {
          await api.post('/suppliers', values);
          setShowCreate(false);
          fetchData();
        }}
        submitLabel="创建"
      />

      {/* Batch Edit Modal */}
      <Modal isOpen={showBatchEdit} onClose={() => setShowBatchEdit(false)} title={`批量编辑 ${selectedIds.size} 项`} size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">仅填写需要修改的字段，留空则不修改</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="公司名称" value={batchForm.company_name} onChange={(e) => setBatchForm({ ...batchForm, company_name: e.target.value })} />
            <Input label="联系人" value={batchForm.contact_person} onChange={(e) => setBatchForm({ ...batchForm, contact_person: e.target.value })} />
            <Input label="电话" value={batchForm.phone} onChange={(e) => setBatchForm({ ...batchForm, phone: e.target.value })} />
            <Input label="邮箱" value={batchForm.email} onChange={(e) => setBatchForm({ ...batchForm, email: e.target.value })} />
            <Input label="国家" value={batchForm.country} onChange={(e) => setBatchForm({ ...batchForm, country: e.target.value })} />
            <Input label="主营产品" value={batchForm.main_products} onChange={(e) => setBatchForm({ ...batchForm, main_products: e.target.value })} />
            <Input label="付款条件" value={batchForm.payment_terms} onChange={(e) => setBatchForm({ ...batchForm, payment_terms: e.target.value })} />
            <Input label="货币" value={batchForm.currency} onChange={(e) => setBatchForm({ ...batchForm, currency: e.target.value })} />
            <Input label="交货天数" value={batchForm.lead_time_days} onChange={(e) => setBatchForm({ ...batchForm, lead_time_days: e.target.value })} />
            <Input label="评级 (0-5)" value={batchForm.rating} onChange={(e) => setBatchForm({ ...batchForm, rating: e.target.value })} />
          </div>
          <Input label="备注" value={batchForm.notes} onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })} />
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
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3"><p className="text-2xl font-bold">{batchProgress.done}</p><p className="text-xs text-gray-500">已完成</p></div>
              <div className="rounded-lg bg-green-50 p-3"><p className="text-2xl font-bold text-green-600">{batchProgress.success}</p><p className="text-xs text-gray-500">成功</p></div>
              <div className="rounded-lg bg-red-50 p-3"><p className="text-2xl font-bold text-red-600">{batchProgress.failed}</p><p className="text-xs text-gray-500">失败</p></div>
            </div>
            {batchProgress.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded bg-red-50 p-3 text-sm text-red-600">
                {batchProgress.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            {!batchProgress.running && <div className="flex justify-end"><Button onClick={() => setBatchProgress(null)}>关闭</Button></div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
