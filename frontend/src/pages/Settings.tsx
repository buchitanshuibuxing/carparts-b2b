import { useEffect, useState } from 'react';
import { Save, Zap } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

import { useToast } from '@/components/ui/Toast';
const AI_PROVIDERS = [
  { value: 'zhipu', label: '智谱 AI', defaultModel: 'glm-4v-flash' },
  { value: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat' },
  { value: 'qwen', label: '通义千问 (阿里)', defaultModel: 'qwen-vl-max' },
  { value: 'doubao', label: '豆包 (字节)', defaultModel: 'doubao-vision-pro-32k' },
  { value: 'hunyuan', label: '腾讯混元', defaultModel: 'hunyuan-vision' },
  { value: 'kimi', label: 'Kimi (月之暗面)', defaultModel: 'moonshot-v1-8k-vision' },
  { value: 'mimo', label: 'MiMo (小米)', defaultModel: 'mimo-vl' },
  { value: 'bailian', label: '阿里百炼', defaultModel: 'qwen-vl-max' },
  { value: 'volcengine', label: '火山引擎', defaultModel: 'doubao-vision-pro-32k' },
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o' },
  { value: 'anthropic', label: 'Anthropic (Claude)', defaultModel: 'claude-sonnet-4-20250514' },
  { value: 'custom', label: '自定义 API', defaultModel: '' },
];

const OE_PROVIDERS = [
  { value: 'zhipu', label: '智谱 AI', defaultModel: 'glm-4-flash' },
  { value: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat' },
  { value: 'qwen', label: '通义千问 (阿里)', defaultModel: 'qwen-plus' },
  { value: 'doubao', label: '豆包 (字节)', defaultModel: 'doubao-pro-32k' },
  { value: 'hunyuan', label: '腾讯混元', defaultModel: 'hunyuan-standard' },
  { value: 'kimi', label: 'Kimi (月之暗面)', defaultModel: 'moonshot-v1-8k' },
  { value: 'mimo', label: 'MiMo (小米)', defaultModel: 'mimo' },
  { value: 'bailian', label: '阿里百炼', defaultModel: 'qwen-plus' },
  { value: 'volcengine', label: '火山引擎', defaultModel: 'doubao-pro-32k' },
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  { value: 'custom', label: '自定义 API', defaultModel: '' },
];

const OCR_OPTIONS = [
  { value: 'tesseract', label: 'Tesseract.js（本地免费）', hasApi: false },
  { value: 'baidu', label: '百度 OCR', hasApi: true, keyLabel: 'API Key', secretLabel: 'Secret Key' },
  { value: 'tencent', label: '腾讯云 OCR', hasApi: true, keyLabel: 'SecretId', secretLabel: 'SecretKey' },
  { value: 'aliyun', label: '阿里云 OCR', hasApi: true, keyLabel: 'AccessKey ID', secretLabel: 'AccessKey Secret' },
  { value: 'custom', label: '自定义 API', hasApi: true, keyLabel: 'API Key', secretLabel: '' },
];

export default function Settings() {
  const { success, error, warning } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data.data || data || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSaveAll = async (items: Record<string, string>) => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(items)) {
        await api.put(`/settings/${key}`, { value });
      }
      setSettings({ ...settings, ...items });
      success('保存成功');
    } catch (err: any) {
      error(err.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  const handleTest = async (type: string) => {
    setTesting(type);
    setTestResult({ ...testResult, [type]: undefined as any });
    try {
      const { data } = await api.post(`/settings/test-connection/${type}`);
      setTestResult({ ...testResult, [type]: data.data || data });
    } catch (err: any) {
      setTestResult({ ...testResult, [type]: { success: false, message: err.response?.data?.message || '测试失败' } });
    } finally { setTesting(null); }
  };

  const get = (key: string) => settings[key] || '';
  const set = (key: string, value: string) => setSettings({ ...settings, [key]: value });


  const onProviderChange = (type: 'ai_recognition' | 'oe_lookup', value: string, providers: typeof AI_PROVIDERS) => {
    set(`${type}_api_type`, value);
    const p = providers.find(pr => pr.value === value);
    if (p?.defaultModel && !get(`${type}_model`)) {
      set(`${type}_model`, p.defaultModel);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">系统设置</h1>

      {/* Basic Settings */}
      <Card>
        <Card.Header><h2 className="text-lg font-semibold">基本设置</h2></Card.Header>
        <Card.Body>
          <div className="space-y-4">
            {[
              { key: 'company_name', label: '公司名称' },
              { key: 'company_logo_url', label: '公司 Logo URL' },
              { key: 'default_currency', label: '默认货币' },
              { key: 'default_language', label: '默认语言' },
            ].map(({ key, label }) => (
              <Input key={key} label={label} value={get(key)} onChange={(e) => set(key, e.target.value)} />
            ))}
            <Button onClick={() => handleSaveAll({
              company_name: get('company_name'),
              company_logo_url: get('company_logo_url'),
              default_currency: get('default_currency'),
              default_language: get('default_language'),
            })} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />保存基本设置
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Seller Info */}
      <Card>
        <Card.Header><h2 className="text-lg font-semibold">卖方信息</h2></Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">创建报价单时自动填充的卖方信息</p>
            {[
              { key: 'seller_company', label: '公司名称 (英文)', placeholder: 'Beijing Yunbaohang Trading Co., Ltd.' },
              { key: 'seller_contact', label: '联系人', placeholder: 'Zhang San' },
              { key: 'seller_phone', label: '电话', placeholder: '+86 131-xxxx-xxxx' },
              { key: 'seller_email', label: '邮箱', placeholder: 'sales@company.com' },
              { key: 'seller_address', label: '地址', placeholder: 'Room xxx, Building xxx, District, Beijing, China' },
            ].map(({ key, label, placeholder }) => (
              <Input key={key} label={label} value={get(key)} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} />
            ))}
            <Button onClick={() => handleSaveAll({
              seller_company: get('seller_company'),
              seller_contact: get('seller_contact'),
              seller_phone: get('seller_phone'),
              seller_email: get('seller_email'),
              seller_address: get('seller_address'),
            })} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />保存卖方信息
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* OCR Settings */}
      <Card>
        <Card.Header><h2 className="text-lg font-semibold">OCR 文字识别</h2></Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={get('ocr_enabled') !== 'false'} onChange={(e) => set('ocr_enabled', e.target.checked ? 'true' : 'false')} className="rounded w-4 h-4" />
              <span className="text-sm font-medium">启用 OCR 文字识别</span>
            </label>
            <Select
              label="OCR 引擎"
              value={get('ocr_api_type') || 'tesseract'}
              onChange={(e) => set('ocr_api_type', e.target.value)}
              options={OCR_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            />
            {get('ocr_api_type') !== 'tesseract' && (() => {
              const ocrOpt = OCR_OPTIONS.find(o => o.value === get('ocr_api_type'));
              return (
                <>
                  <Input label={ocrOpt?.keyLabel || 'API Key'} type="password" value={get('ocr_api_key')} onChange={(e) => set('ocr_api_key', e.target.value)} placeholder={`输入 ${ocrOpt?.keyLabel || 'API Key'}`} />
                  {ocrOpt?.secretLabel && (
                    <Input label={ocrOpt.secretLabel} type="password" value={get('ocr_api_secret')} onChange={(e) => set('ocr_api_secret', e.target.value)} placeholder={`输入 ${ocrOpt.secretLabel}`} />
                  )}
                  <Input label="API URL" value={get('ocr_api_url')} onChange={(e) => set('ocr_api_url', e.target.value)} placeholder={
                    get('ocr_api_type') === 'baidu' ? 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic' :
                    get('ocr_api_type') === 'tencent' ? 'https://ocr.tencentcloudapi.com' :
                    get('ocr_api_type') === 'aliyun' ? 'https://ocr-api.cn-hangzhou.aliyuncs.com' :
                    'https://your-ocr-api.com/ocr'
                  } />
                </>
              );
            })()}
            <div className="flex gap-2">
              <Button onClick={() => handleSaveAll({
                ocr_enabled: get('ocr_enabled'),
                ocr_api_type: get('ocr_api_type'),
                ocr_api_key: get('ocr_api_key') || '',
                ocr_api_secret: get('ocr_api_secret') || '',
                ocr_api_url: get('ocr_api_url') || '',
              })} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />保存 OCR 设置
              </Button>
              {get('ocr_api_type') !== 'tesseract' && (
                <Button variant="secondary" onClick={() => handleTest('ocr')} disabled={testing === 'ocr'}>
                  <Zap className="h-4 w-4 mr-1" />{testing === 'ocr' ? '测试中...' : '测试连接'}
                </Button>
              )}
            </div>
            {testResult['ocr'] && (
              <p className={`text-sm ${testResult['ocr'].success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult['ocr'].success ? '✓' : '✗'} {testResult['ocr'].message}
              </p>
            )}
            {get('ocr_api_type') !== 'tesseract' && (
              <p className="text-xs text-gray-500">注：非本地 OCR 需要配置对应的密钥信息。Tesseract.js 为本地免费方案，但识别精度较低。</p>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* AI Recognition Settings */}
      <Card>
        <Card.Header><h2 className="text-lg font-semibold">AI 图片识别</h2></Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={get('ai_recognition_enabled') !== 'false'} onChange={(e) => set('ai_recognition_enabled', e.target.checked ? 'true' : 'false')} className="rounded w-4 h-4" />
              <span className="text-sm font-medium">启用 AI 图片识别</span>
            </label>
            <Select
              label="AI 服务商"
              value={get('ai_recognition_api_type') || 'zhipu'}
              onChange={(e) => onProviderChange('ai_recognition', e.target.value, AI_PROVIDERS)}
              options={AI_PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
            />
            <Input label="API Key" type="password" value={get('ai_recognition_api_key')} onChange={(e) => set('ai_recognition_api_key', e.target.value)} placeholder="输入 API Key" />
            <Input label="模型名称" value={get('ai_recognition_model')} onChange={(e) => set('ai_recognition_model', e.target.value)}
              placeholder={AI_PROVIDERS.find(p => p.value === (get('ai_recognition_api_type') || 'zhipu'))?.defaultModel || ''} />
            {get('ai_recognition_api_type') === 'custom' && (
              <Input label="自定义 API URL" value={get('ai_recognition_api_url')} onChange={(e) => set('ai_recognition_api_url', e.target.value)} placeholder="https://your-api.com/v1/chat/completions" />
            )}
            <div className="flex gap-2">
              <Button onClick={() => handleSaveAll({
                ai_recognition_enabled: get('ai_recognition_enabled'),
                ai_recognition_api_type: get('ai_recognition_api_type'),
                ai_recognition_api_key: get('ai_recognition_api_key'),
                ai_recognition_model: get('ai_recognition_model'),
                ai_recognition_api_url: get('ai_recognition_api_url') || '',
              })} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />保存 AI 识别设置
              </Button>
              <Button variant="secondary" onClick={() => handleTest('ai_recognition')} disabled={testing === 'ai_recognition'}>
                <Zap className="h-4 w-4 mr-1" />{testing === 'ai_recognition' ? '测试中...' : '测试连接'}
              </Button>
            </div>
            {testResult['ai_recognition'] && (
              <p className={`text-sm ${testResult['ai_recognition'].success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult['ai_recognition'].success ? '✓' : '✗'} {testResult['ai_recognition'].message}
              </p>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* OE Lookup Settings */}
      <Card>
        <Card.Header><h2 className="text-lg font-semibold">OE 名称查询</h2></Card.Header>
        <Card.Body>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={get('oe_lookup_enabled') !== 'false'} onChange={(e) => set('oe_lookup_enabled', e.target.checked ? 'true' : 'false')} className="rounded w-4 h-4" />
              <span className="text-sm font-medium">启用 OE 号名称查询</span>
            </label>
            <Select
              label="AI 服务商"
              value={get('oe_lookup_api_type') || 'zhipu'}
              onChange={(e) => onProviderChange('oe_lookup', e.target.value, OE_PROVIDERS)}
              options={OE_PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
            />
            <Input label="API Key" type="password" value={get('oe_lookup_api_key')} onChange={(e) => set('oe_lookup_api_key', e.target.value)} placeholder="输入 API Key" />
            <Input label="模型名称" value={get('oe_lookup_model')} onChange={(e) => set('oe_lookup_model', e.target.value)}
              placeholder={OE_PROVIDERS.find(p => p.value === (get('oe_lookup_api_type') || 'zhipu'))?.defaultModel || ''} />
            {get('oe_lookup_api_type') === 'custom' && (
              <Input label="自定义 API URL" value={get('oe_lookup_api_url')} onChange={(e) => set('oe_lookup_api_url', e.target.value)} placeholder="https://your-api.com/v1/chat/completions" />
            )}
            <div className="flex gap-2">
              <Button onClick={() => handleSaveAll({
                oe_lookup_enabled: get('oe_lookup_enabled'),
                oe_lookup_api_type: get('oe_lookup_api_type'),
                oe_lookup_api_key: get('oe_lookup_api_key'),
                oe_lookup_model: get('oe_lookup_model'),
                oe_lookup_api_url: get('oe_lookup_api_url') || '',
              })} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />保存 OE 查询设置
              </Button>
              <Button variant="secondary" onClick={() => handleTest('oe_lookup')} disabled={testing === 'oe_lookup'}>
                <Zap className="h-4 w-4 mr-1" />{testing === 'oe_lookup' ? '测试中...' : '测试连接'}
              </Button>
            </div>
            {testResult['oe_lookup'] && (
              <p className={`text-sm ${testResult['oe_lookup'].success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult['oe_lookup'].success ? '✓' : '✗'} {testResult['oe_lookup'].message}
              </p>
            )}
          </div>
        </Card.Body>
      </Card>

    </div>
  );
}
