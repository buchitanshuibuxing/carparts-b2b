import { useEffect, useState, useRef } from 'react';
import { Save, Zap, Activity, Database, Server, HardDrive, Cpu, MemoryStick, Clock, RefreshCw, AlertCircle, Terminal, RotateCw, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
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

const TABS = [
  { id: 'basic', label: '基本设置' },
  { id: 'ocr', label: 'OCR 设置' },
  { id: 'ai', label: 'AI 识别' },
  { id: 'translation', label: '翻译 API' },
  { id: 'system', label: '系统管理' },
];

interface HealthData {
  cpu: { usage: number; cores: number; model: string; loadAvg: string[] };
  memory: { total: number; used: number; free: number; percent: number };
  disk: { total: string; used: string; free: string; percent: number };
  database: { status: string; responseTime: number };
  pm2: { status: string; uptime: string; memory: string; restarts: number; pid: number };
  server: { hostname: string; platform: string; arch: string; uptime: string; nodeVersion: string };
}

export default function Settings() {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});

  // 系统管理相关状态
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logType, setLogType] = useState<'out' | 'error'>('out');
  const [restarting, setRestarting] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data.data || data || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  // 获取健康数据
  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const { data } = await api.get('/system/health');
      setHealth(data.data || data);
    } catch (err) {
      showError('获取系统状态失败');
    } finally {
      setHealthLoading(false);
    }
  };

  // 获取日志
  const fetchLogs = async (type?: 'out' | 'error') => {
    const logTypeToFetch = type || logType;
    setLogsLoading(true);
    try {
      const { data } = await api.get(`/system/logs?type=${logTypeToFetch}&lines=80`);
      setLogs(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      showError('获取日志失败');
    } finally {
      setLogsLoading(false);
    }
  };

  // 切换到系统管理标签时加载数据
  useEffect(() => {
    if (activeTab === 'system') {
      fetchHealth();
      fetchLogs();
    }
  }, [activeTab]);

  // 日志类型切换时重新加载
  useEffect(() => {
    if (activeTab === 'system') {
      fetchLogs(logType);
    }
  }, [logType]);

  // 日志滚动到底部
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 重启后端
  const handleRestart = async () => {
    if (!confirm('确定要重启后端服务吗？重启期间API将暂时不可用。')) return;
    setRestarting(true);
    try {
      const { data } = await api.post('/system/restart');
      success(data.message || '重启成功');
      // 等待服务恢复后刷新状态
      setTimeout(() => {
        fetchHealth();
        fetchLogs();
      }, 3000);
    } catch (err: any) {
      showError(err.response?.data?.message || '重启失败');
    } finally {
      setRestarting(false);
    }
  };

  // 清理日志
  const handleClearLogs = async () => {
    if (!confirm('确定要清理日志吗？')) return;
    setClearingLogs(true);
    try {
      const { data } = await api.post('/system/logs/clear');
      success(data.message || '日志已清理');
      setLogs([]);
    } catch (err: any) {
      showError(err.response?.data?.message || '清理失败');
    } finally {
      setClearingLogs(false);
    }
  };

  const handleSaveAll = async (items: Record<string, string>) => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(items)) {
        await api.put(`/settings/${key}`, { value });
      }
      setSettings({ ...settings, ...items });
      success('保存成功');
    } catch (err: any) {
      showError(err.response?.data?.message || '保存失败');
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

  // 渲染健康状态指示器
  const renderHealthIndicator = (status: string) => {
    const isGood = status === 'connected' || status === 'online';
    return (
      <span className={`inline-flex items-center gap-1.5 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        <span className={`w-2 h-2 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} />
        {isGood ? '正常' : '异常'}
      </span>
    );
  };

  // 渲染进度条
  const renderProgressBar = (percent: number, color: string = 'blue') => {
    const colorClass = percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : `bg-${color}-500`;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
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

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 标签页内容 */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <Card.Header><h2 className="text-lg font-semibold">基本设置</h2></Card.Header>
            <Card.Body>
              <div className="space-y-6">
                <p className="text-sm text-gray-500">公司名称和 Logo 将显示在浏览器标签页标题和图标中</p>

                {/* 公司名称 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">公司名称</label>
                  <input
                    type="text"
                    value={get('company_name')}
                    onChange={e => set('company_name', e.target.value)}
                    placeholder="输入公司名称"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-400">将显示在浏览器标签页标题中</p>
                </div>

                {/* Logo 上传 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">网站图标 (Favicon)</label>
                  <div className="flex items-start gap-4">
                    {/* 预览区域 */}
                    <div className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                      {get('company_logo_url') ? (
                        <img
                          src={get('company_logo_url')}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="text-center">
                          <div className="text-gray-300 text-2xl">🌐</div>
                          <p className="text-[10px] text-gray-400 mt-1">无图标</p>
                        </div>
                      )}
                    </div>

                    {/* 上传/输入区域 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('file', file);
                              try {
                                const { data } = await api.post('/assets/upload', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                });
                                const asset = data.data || data;
                                // filePath 是相对路径，需要构建完整 URL
                                const filePath = asset.filePath || asset.file_path;
                                if (filePath) {
                                  // 构建完整 URL: /uploads/xxx.png
                                  const url = filePath.startsWith('/') ? filePath : `/uploads/${filePath}`;
                                  set('company_logo_url', url);
                                  success('上传成功，点击保存后生效');
                                }
                              } catch {
                                showError('上传失败');
                              }
                            }}
                          />
                          <div className="flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            上传图片
                          </div>
                        </label>
                        {get('company_logo_url') && (
                          <button
                            onClick={() => set('company_logo_url', '')}
                            className="px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-sm text-gray-500"
                          >
                            清除
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={get('company_logo_url')}
                        onChange={e => set('company_logo_url', e.target.value)}
                        placeholder="或输入图标 URL"
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-200"
                      />
                      <p className="text-xs text-gray-400">支持 PNG/JPG/SVG，建议 32x32 或 64x64 像素</p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSaveAll({
                  company_name: get('company_name'),
                  company_logo_url: get('company_logo_url'),
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
      )}

      {activeTab === 'ocr' && (
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
      )}

      {activeTab === 'ai' && (
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
      )}

      {activeTab === 'translation' && (
        <Card>
          <Card.Header><h2 className="text-lg font-semibold">翻译 API 设置</h2></Card.Header>
          <Card.Body>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">用于配件目录的"一键匹配英文"功能，优先使用百度翻译，失败时回退到AI翻译</p>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={get('translate_enabled') !== 'false'} onChange={(e) => set('translate_enabled', e.target.checked ? 'true' : 'false')} className="rounded w-4 h-4" />
                <span className="text-sm font-medium">启用翻译 API</span>
              </label>
              <Input label="百度翻译 APP ID" value={get('translate_api_appid')} onChange={(e) => set('translate_api_appid', e.target.value)} placeholder="输入百度翻译 APP ID" />
              <Input label="百度翻译密钥" type="password" value={get('translate_api_key')} onChange={(e) => set('translate_api_key', e.target.value)} placeholder="输入百度翻译密钥" />
              <p className="text-xs text-gray-400">
                获取方式：<a href="https://fanyi-api.baidu.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">百度翻译开放平台</a> → 注册 → 获取 APP ID 和密钥
              </p>
              <div className="flex gap-2">
                <Button onClick={() => handleSaveAll({
                  translate_enabled: get('translate_enabled'),
                  translate_api_appid: get('translate_api_appid'),
                  translate_api_key: get('translate_api_key'),
                })} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />保存翻译设置
                </Button>
                <Button variant="secondary" onClick={() => handleTest('baidu_translate')} disabled={testing === 'baidu_translate'}>
                  <Zap className="h-4 w-4 mr-1" />{testing === 'baidu_translate' ? '测试中...' : '测试连接'}
                </Button>
              </div>
              {testResult['baidu_translate'] && (
                <p className={`text-sm ${testResult['baidu_translate'].success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult['baidu_translate'].success ? '✓' : '✗'} {testResult['baidu_translate'].message}
                </p>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* 系统健康检查 */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Activity size={20} /> 系统健康检查
                </h2>
                <Button variant="secondary" onClick={fetchHealth} disabled={healthLoading}>
                  <RefreshCw size={16} className={`mr-1 ${healthLoading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {healthLoading && !health ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : health ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* CPU */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu size={18} className="text-blue-500" />
                      <span className="font-medium">CPU</span>
                    </div>
                    <div className="text-2xl font-bold mb-2">{health.cpu.usage}%</div>
                    {renderProgressBar(health.cpu.usage)}
                    <div className="text-xs text-gray-500 mt-2">
                      {health.cpu.cores} 核心 · 负载: {health.cpu.loadAvg.join(' / ')}
                    </div>
                  </div>

                  {/* 内存 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MemoryStick size={18} className="text-green-500" />
                      <span className="font-medium">内存</span>
                    </div>
                    <div className="text-2xl font-bold mb-2">{health.memory.percent}%</div>
                    {renderProgressBar(health.memory.percent)}
                    <div className="text-xs text-gray-500 mt-2">
                      已用: {health.memory.used}MB / 总计: {health.memory.total}MB
                    </div>
                  </div>

                  {/* 磁盘 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive size={18} className="text-purple-500" />
                      <span className="font-medium">磁盘</span>
                    </div>
                    <div className="text-2xl font-bold mb-2">{health.disk.percent}%</div>
                    {renderProgressBar(health.disk.percent)}
                    <div className="text-xs text-gray-500 mt-2">
                      已用: {health.disk.used} / 总计: {health.disk.total}
                    </div>
                  </div>

                  {/* 数据库 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={18} className="text-orange-500" />
                      <span className="font-medium">数据库</span>
                    </div>
                    <div className="text-lg font-bold mb-2">
                      {renderHealthIndicator(health.database.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                      响应时间: {health.database.responseTime}ms
                    </div>
                  </div>

                  {/* PM2 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Server size={18} className="text-cyan-500" />
                      <span className="font-medium">后端服务</span>
                    </div>
                    <div className="text-lg font-bold mb-2">
                      {renderHealthIndicator(health.pm2.status)}
                    </div>
                    <div className="text-xs text-gray-500">
                      运行时间: {health.pm2.uptime} · 内存: {health.pm2.memory} · 重启: {health.pm2.restarts}次
                    </div>
                  </div>

                  {/* 服务器 */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={18} className="text-indigo-500" />
                      <span className="font-medium">服务器</span>
                    </div>
                    <div className="text-lg font-bold mb-2">
                      {health.server.hostname}
                    </div>
                    <div className="text-xs text-gray-500">
                      运行时间: {health.server.uptime} · Node: {health.server.nodeVersion}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle size={24} className="mx-auto mb-2" />
                  <p>无法获取系统状态</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* 服务管理 */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Server size={20} /> 服务管理
                </h2>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleRestart} disabled={restarting}>
                    {restarting ? (
                      <>
                        <RefreshCw size={16} className="mr-1 animate-spin" />
                        重启中...
                      </>
                    ) : (
                      <>
                        <RotateCw size={16} className="mr-1" />
                        重启后端
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {health && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">状态</div>
                    <div className="font-semibold">{health.pm2.status === 'online' ? '🟢 运行中' : '🔴 离线'}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">运行时间</div>
                    <div className="font-semibold">{health.pm2.uptime}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">内存占用</div>
                    <div className="font-semibold">{health.pm2.memory}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">重启次数</div>
                    <div className="font-semibold">{health.pm2.restarts} 次</div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* 日志查看 */}
          <Card>
            <Card.Header>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Terminal size={20} /> 服务器日志
                </h2>
                <div className="flex gap-2">
                  <select
                    value={logType}
                    onChange={e => setLogType(e.target.value as 'out' | 'error')}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-200"
                  >
                    <option value="out">运行日志</option>
                    <option value="error">错误日志</option>
                  </select>
                  <Button variant="secondary" onClick={() => fetchLogs()} disabled={logsLoading}>
                    <RefreshCw size={16} className={`mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                  <Button variant="secondary" onClick={handleClearLogs} disabled={clearingLogs}>
                    <Trash2 size={16} className="mr-1" />
                    清理
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div
                ref={logContainerRef}
                className="bg-gray-900 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto"
              >
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-400">
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                    加载中...
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">暂无日志</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-800">
                      <tr className="text-gray-400">
                        <th className="text-left py-2 px-3 font-medium w-[160px]">时间</th>
                        <th className="text-center py-2 px-3 font-medium w-[60px]">级别</th>
                        <th className="text-left py-2 px-3 font-medium w-[120px]">模块</th>
                        <th className="text-left py-2 px-3 font-medium">消息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => {
                        const isParsed = log.time && log.module;
                        const isError = log.level === 'error';
                        const isWarn = log.level === 'warn';
                        const levelColor = isError ? 'text-red-400 bg-red-900/20' : isWarn ? 'text-yellow-400 bg-yellow-900/20' : 'text-green-400';
                        const levelBadge = isError ? 'bg-red-500/20 text-red-400' : isWarn ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400';
                        const levelText = log.level === 'error' ? 'ERR' : log.level === 'warn' ? 'WARN' : 'LOG';

                        if (isParsed) {
                          return (
                            <tr key={i} className={`border-t border-gray-800/50 hover:bg-gray-800/30 ${isError ? 'bg-red-900/10' : ''}`}>
                              <td className="py-1.5 px-3 text-gray-500 font-mono whitespace-nowrap">{log.time}</td>
                              <td className="py-1.5 px-3 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${levelBadge}`}>
                                  {levelText}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-cyan-400 font-mono">{log.module}</td>
                              <td className={`py-1.5 px-3 font-mono break-all ${isError ? 'text-red-300' : isWarn ? 'text-yellow-300' : 'text-gray-300'}`}>
                                {log.message}
                              </td>
                            </tr>
                          );
                        }

                        // 未解析的原始日志
                        return (
                          <tr key={i} className={`border-t border-gray-800/50 ${isError ? 'bg-red-900/10' : ''}`}>
                            <td className="py-1.5 px-3 text-gray-600">-</td>
                            <td className="py-1.5 px-3 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${levelBadge}`}>
                                {levelText}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-gray-600">-</td>
                            <td className={`py-1.5 px-3 font-mono break-all ${isError ? 'text-red-300' : isWarn ? 'text-yellow-300' : 'text-gray-400'}`}>
                              {log.raw}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
}
