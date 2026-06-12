import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Edit, Save } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { AssetClassification } from '@/types/image-asset';

import { useToast } from '@/components/ui/Toast';
interface PartDetail {
  id: number;
  oeNumber: string;
  partNameCn: string;
  partNameEn: string;
  partNameKo: string;
  classificationId?: number;
  classification?: { id: number; name: string };
  category: string;
  subCategory: string;
  brand: string;
  carModel: string;
  engineType: string;
  modelYearFrom?: number;
  modelYearTo?: number;
  partType: string;
  unit: string;
  weightKg: number;
  dimensionsCm: string;
  hsCode: string;
  notes: string;
  isActive: boolean;
  inventory?: { quantity: number; reservedQuantity: number; minStock: number };
}

export default function PartDetail() {
  const { success, error, warning } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<PartDetail>>({});
  const [saving, setSaving] = useState(false);
  const [classifications, setClassifications] = useState<AssetClassification[]>([]);

  const fetchPart = async () => {
    try {
      const { data } = await api.get(`/parts/${id}`);
      const p = data.data || data;
      setPart(p);
      setForm(p);
    } catch {
      navigate('/parts');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassifications = async () => {
    try {
      const { data: res } = await api.get('/assets/meta/classifications');
      setClassifications(res.data || res || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchPart(); fetchClassifications(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, classification_id: form.classificationId || null };
      await api.put(`/parts/${id}`, payload);
      setEditing(false);
      fetchPart();
    } catch (err: any) {
      error(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!part) return null;

  const fields: { key: keyof PartDetail; label: string }[] = [
    { key: 'oeNumber', label: 'OE 编号' },
    { key: 'partNameCn', label: '中文名称' },
    { key: 'partNameEn', label: '英文名称' },
    { key: 'partNameKo', label: '韩文名称' },
    { key: 'subCategory', label: '子分类' },
    { key: 'brand', label: '品牌' },
    { key: 'carModel', label: '车型' },
    { key: 'engineType', label: '发动机类型' },
    { key: 'partType', label: '配件类型' },
    { key: 'unit', label: '单位' },
    { key: 'hsCode', label: 'HS 编码' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/parts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">配件详情</h1>
        <Badge color={part.isActive ? 'green' : 'gray'}>
          {part.isActive ? '启用' : '停用'}
        </Badge>
        <div className="ml-auto">
          {editing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setEditing(false); setForm(part); }}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-1 h-4 w-4" /> {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Edit className="mr-1 h-4 w-4" /> 编辑
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5" /> 基本信息
            </h2>
          </Card.Header>
          <Card.Body>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Classification field */}
              <div>
                {editing ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">分类</label>
                    <select
                      value={form.classificationId || ''}
                      onChange={(e) => setForm({ ...form, classificationId: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150"
                    >
                      <option value="">选择分类</option>
                      {classifications.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-500">分类</span>
                    <p>{part.classification?.name || part.category || '-'}</p>
                  </>
                )}
              </div>
              {fields.map(({ key, label }) => (
                <div key={key}>
                  {editing ? (
                    <Input
                      label={label}
                      value={(form[key] as string) || ''}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  ) : (
                    <>
                      <span className="text-sm text-gray-500">{label}</span>
                      <p>{(part[key] as string) || '-'}</p>
                    </>
                  )}
                </div>
              ))}
              <div>
                {editing ? (
                  <Input
                    label="备注"
                    value={form.notes || ''}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                ) : (
                  <>
                    <span className="text-sm text-gray-500">备注</span>
                    <p>{part.notes || '-'}</p>
                  </>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header><h2 className="text-lg font-semibold">库存信息</h2></Card.Header>
          <Card.Body>
            {part.inventory ? (
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">当前库存</span>
                  <p className="text-2xl font-bold">{part.inventory.quantity}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">已预留</span>
                  <p className="text-lg">{part.inventory.reservedQuantity}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">最低库存</span>
                  <p className="text-lg">{part.inventory.minStock}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">可用库存</span>
                  <p className={`text-lg font-bold ${
                    part.inventory.quantity - part.inventory.reservedQuantity <= part.inventory.minStock
                      ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {part.inventory.quantity - part.inventory.reservedQuantity}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">暂无库存数据</p>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
