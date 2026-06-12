import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { FormModal } from '@/components/ui/FormModal';
import api from '@/lib/api';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
// Type Config Modal Component (extracted to avoid cursor issues)
function TypeConfigModal({ initialTypes, initialLevels, onSave, onClose }: {
  initialTypes: string[];
  initialLevels: string[];
  onSave: (types: string[], levels: string[]) => void;
  onClose: () => void;
}) {
  const [types, setTypes] = useState(initialTypes.join('\n'));
  const [levels, setLevels] = useState(initialLevels.join('\n'));
  const newTypeRef = useRef<HTMLInputElement>(null);
  const newLevelRef = useRef<HTMLInputElement>(null);

  return (
    <Modal isOpen={true} onClose={onClose} title="客户类型管理" size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">客户类型</h3>
          <p className="text-xs text-gray-400 mb-2">每行一个类型</p>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm"
            rows={5} value={types} onChange={(e) => setTypes(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <input ref={newTypeRef} placeholder="新增类型"
              className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTypeRef.current?.value) {
                  setTypes(types ? types + '\n' + newTypeRef.current.value : newTypeRef.current.value);
                  newTypeRef.current.value = '';
                }
              }}
            />
            <Button variant="secondary" onClick={() => {
              if (newTypeRef.current?.value) {
                setTypes(types ? types + '\n' + newTypeRef.current.value : newTypeRef.current.value);
                newTypeRef.current.value = '';
              }
            }}>添加</Button>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">客户等级</h3>
          <p className="text-xs text-gray-400 mb-2">每行一个等级</p>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm"
            rows={4} value={levels} onChange={(e) => setLevels(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <input ref={newLevelRef} placeholder="新增等级"
              className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newLevelRef.current?.value) {
                  setLevels(levels ? levels + '\n' + newLevelRef.current.value : newLevelRef.current.value);
                  newLevelRef.current.value = '';
                }
              }}
            />
            <Button variant="secondary" onClick={() => {
              if (newLevelRef.current?.value) {
                setLevels(levels ? levels + '\n' + newLevelRef.current.value : newLevelRef.current.value);
                newLevelRef.current.value = '';
              }
            }}>添加</Button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={() => {
            const t = types.split('\n').map(s => s.trim()).filter(Boolean);
            const l = levels.split('\n').map(s => s.trim()).filter(Boolean);
            onSave(t, l);
          }}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Customers() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<any>({ items: [], total: 0, page: 1, page_size: 20 });
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  // Customer types config
  const [customerTypes, setCustomerTypes] = useState<string[]>(['经销商', '修理厂', '终端客户', '贸易商', '电商平台']);
  const [customerLevels, setCustomerLevels] = useState<string[]>(['普通', 'VIP', '重点', '潜在']);
  const [showTypeConfig, setShowTypeConfig] = useState(false);

  // Batch operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchForm, setBatchForm] = useState({ company_name: '', contact_person: '', phone: '', email: '', country: '', customer_type: '', customer_level: '', payment_terms: '', currency: '', notes: '' });
  const [batchProgress, setBatchProgress] = useState<{ total: number; done: number; success: number; failed: number; errors: string[]; running: boolean } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editForm, setEditForm] = useState({ company_name: '', contact_person: '', phone: '', email: '', country: '', region: '', customer_type: '', customer_level: '', currency: '', credit_limit: '', payment_terms: '', notes: '' });

  const openEdit = (c: any) => {
    setEditingCustomer(c);
    setEditForm({
      company_name: c.companyName || '',
      contact_person: c.contactPerson || '',
      phone: c.phone || '',
      email: c.email || '',
      country: c.country || '',
      region: c.region || '',
      customer_type: c.customerType || '',
      customer_level: c.customerLevel || '',
      currency: c.currency || 'USD',
      credit_limit: String(c.creditLimit || ''),
      payment_terms: c.paymentTerms || '',
      notes: c.notes || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingCustomer) return;
    const body: any = {};
    for (const [k, v] of Object.entries(editForm)) {
      if (v !== '') body[k] = k === 'credit_limit' ? Number(v) : v;
    }
    try {
      await api.put(`/customers/${editingCustomer.id}`, body);
      setEditingCustomer(null);
      setSelectedCustomer(null);
      fetchData();
    } catch (err: any) {
      error(err.response?.data?.message || '更新失败');
    }
  };

  const fetchData = async () => {
    const { data: res } = await api.get('/customers', { params: { page, page_size: 20 } });
    setData(res.data || res);
    setSelectedIds(new Set());
  };

  const fetchTypes = async () => {
    try {
      const { data } = await api.get('/customers/config/types');
      if (data.types) setCustomerTypes(data.types);
      if (data.levels) setCustomerLevels(data.levels);
    } catch { /* use defaults */ }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => { fetchTypes(); }, []);

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
    for (const [k, v] of Object.entries(batchForm)) {
      if (v) body[k] = v;
    }
    if (Object.keys(body).length <= 1) { success('请填写至少一个修改项'); return; }
    setShowBatchEdit(false);
    try {
      const { data } = await api.post('/customers/batch-update', body);
      setBatchProgress({ total: ids.length, done: ids.length, success: data.updated || ids.length, failed: 0, errors: [], running: false });
    } catch (err: any) {
      setBatchProgress({ total: ids.length, done: ids.length, success: 0, failed: ids.length, errors: [err.response?.data?.message || '批量更新失败'], running: false });
    }
    setBatchForm({ company_name: '', contact_person: '', phone: '', email: '', country: '', customer_type: '', customer_level: '', payment_terms: '', currency: '', notes: '' });
    fetchData();
  };

  const handleBatchDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const confirmed = await confirm({ message: `确定删除选中的 ${ids.length} 个客户？`, variant: "danger" });
      if (!confirmed) return;
    try {
      const { data } = await api.post('/customers/batch-delete', { ids });
      setBatchProgress({ total: ids.length, done: ids.length, success: data.deleted || ids.length, failed: 0, errors: [], running: false });
    } catch (err: any) {
      setBatchProgress({ total: ids.length, done: ids.length, success: 0, failed: ids.length, errors: [err.response?.data?.message || '批量删除失败'], running: false });
    }
    fetchData();
  };

  const openTypeConfig = () => {
    setShowTypeConfig(true);
  };

  const columns = [
    { key: 'customerCode', title: '编号' },
    { key: 'companyName', title: '公司名称' },
    { key: 'contactPerson', title: '联系人' },
    { key: 'phone', title: '电话' },
    { key: 'country', title: '国家' },
    { key: 'customerType', title: '类型', render: (r: any) => <Badge>{r.customerType || '-'}</Badge> },
    { key: 'customerLevel', title: '等级', render: (r: any) => <Badge color="blue">{r.customerLevel || '-'}</Badge> },
    { key: 'isActive', title: '状态', render: (r: any) => <Badge color={r.isActive ? 'green' : 'red'}>{r.isActive ? '合作' : '停用'}</Badge> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openTypeConfig}>
            <Settings size={16} className="mr-1" />类型管理
          </Button>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} className="mr-1" />新建</Button>
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

      <div className="bg-white rounded-xl border border-gray-200">
        <Table
          columns={columns}
          data={data.items || []}
          keyField="id"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
          onRowClick={(item) => setSelectedCustomer(item)}
        />
        <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
      </div>

      {/* Create Modal */}
      <FormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="新建客户"
        fields={[
          { name: 'customer_code', label: '客户编号', required: true },
          { name: 'company_name', label: '公司名称', required: true },
          { name: 'contact_person', label: '联系人' },
          { name: 'phone', label: '电话' },
          { name: 'email', label: '邮箱', type: 'email' },
          { name: 'country', label: '国家' },
          { name: 'customer_type', label: '客户类型', type: 'select', options: customerTypes.map(t => ({ value: t, label: t })) },
          { name: 'customer_level', label: '客户等级', type: 'select', options: customerLevels.map(l => ({ value: l, label: l })) },
        ]}
        initialValues={{ customer_code: '', company_name: '', contact_person: '', phone: '', email: '', country: '', customer_type: '经销商', customer_level: '普通' }}
        onSubmit={async (values) => {
          await api.post('/customers', values);
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
            <Select label="客户类型" value={batchForm.customer_type} onChange={(e) => setBatchForm({ ...batchForm, customer_type: e.target.value })}>
              <option value="">不修改</option>
              {customerTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="客户等级" value={batchForm.customer_level} onChange={(e) => setBatchForm({ ...batchForm, customer_level: e.target.value })}>
              <option value="">不修改</option>
              {customerLevels.map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
            <Input label="付款条件" value={batchForm.payment_terms} onChange={(e) => setBatchForm({ ...batchForm, payment_terms: e.target.value })} />
            <Input label="货币" value={batchForm.currency} onChange={(e) => setBatchForm({ ...batchForm, currency: e.target.value })} />
          </div>
          <Input label="备注" value={batchForm.notes} onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowBatchEdit(false)}>取消</Button>
            <Button onClick={handleBatchEdit}>确认修改</Button>
          </div>
        </div>
      </Modal>

      {/* Customer Type Config Modal */}
      {showTypeConfig && (
        <TypeConfigModal
          initialTypes={customerTypes}
          initialLevels={customerLevels}
          onSave={async (types, levels) => {
            try {
              await api.put('/customers/config/types', { types, levels });
              setCustomerTypes(types);
              setCustomerLevels(levels);
              setShowTypeConfig(false);
            } catch { success('保存失败'); }
          }}
          onClose={() => setShowTypeConfig(false)}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <Modal isOpen={true} onClose={() => setEditingCustomer(null)} title={`编辑客户 - ${editingCustomer.companyName}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="公司名称" value={editForm.company_name} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} />
              <Input label="联系人" value={editForm.contact_person} onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })} />
              <Input label="电话" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <Input label="邮箱" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <Input label="国家" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
              <Input label="地区" value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} />
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm" value={editForm.customer_type} onChange={(e) => setEditForm({ ...editForm, customer_type: e.target.value })}>
                <option value="">客户类型</option>
                {customerTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm" value={editForm.customer_level} onChange={(e) => setEditForm({ ...editForm, customer_level: e.target.value })}>
                <option value="">客户等级</option>
                {customerLevels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <Input label="货币" value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })} />
              <Input label="信用额度" type="number" value={editForm.credit_limit} onChange={(e) => setEditForm({ ...editForm, credit_limit: e.target.value })} />
              <Input label="付款条件" value={editForm.payment_terms} onChange={(e) => setEditForm({ ...editForm, payment_terms: e.target.value })} className="col-span-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-sm" rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingCustomer(null)}>取消</Button>
              <Button onClick={handleUpdate}>保存</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Modal isOpen={true} onClose={() => setSelectedCustomer(null)} title="客户详情" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">客户编号</p><p className="text-sm font-medium">{selectedCustomer.customerCode || '-'}</p></div>
              <div><p className="text-xs text-gray-500">公司名称</p><p className="text-sm font-medium">{selectedCustomer.companyName || '-'}</p></div>
              <div><p className="text-xs text-gray-500">联系人</p><p className="text-sm">{selectedCustomer.contactPerson || '-'}</p></div>
              <div><p className="text-xs text-gray-500">电话</p><p className="text-sm">{selectedCustomer.phone || '-'}</p></div>
              <div><p className="text-xs text-gray-500">邮箱</p><p className="text-sm">{selectedCustomer.email || '-'}</p></div>
              <div><p className="text-xs text-gray-500">国家/地区</p><p className="text-sm">{selectedCustomer.country || '-'}{selectedCustomer.region ? ` / ${selectedCustomer.region}` : ''}</p></div>
              <div><p className="text-xs text-gray-500">客户类型</p><p className="text-sm"><Badge>{selectedCustomer.customerType || '-'}</Badge></p></div>
              <div><p className="text-xs text-gray-500">客户等级</p><p className="text-sm"><Badge color="blue">{selectedCustomer.customerLevel || '-'}</Badge></p></div>
              <div><p className="text-xs text-gray-500">货币</p><p className="text-sm">{selectedCustomer.currency || 'USD'}</p></div>
              <div><p className="text-xs text-gray-500">信用额度</p><p className="text-sm">{selectedCustomer.creditLimit || 0}</p></div>
              <div><p className="text-xs text-gray-500">付款条件</p><p className="text-sm">{selectedCustomer.paymentTerms || '-'}</p></div>
              <div><p className="text-xs text-gray-500">状态</p><p className="text-sm"><Badge color={selectedCustomer.isActive ? 'green' : 'red'}>{selectedCustomer.isActive ? '合作中' : '已停用'}</Badge></p></div>
            </div>
            {selectedCustomer.notes && (
              <div><p className="text-xs text-gray-500 mb-1">备注</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedCustomer.notes}</p></div>
            )}
            <div className="text-xs text-gray-400">
              <span>创建时间: {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleString() : '-'}</span>
              {selectedCustomer.updatedAt && <span className="ml-4">更新时间: {new Date(selectedCustomer.updatedAt).toLocaleString()}</span>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedCustomer(null)}>关闭</Button>
              <Button onClick={() => { openEdit(selectedCustomer); setSelectedCustomer(null); }}>编辑</Button>
            </div>
          </div>
        </Modal>
      )}

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
