"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const setting_entity_1 = require("./entities/setting.entity");
let SettingsService = SettingsService_1 = class SettingsService {
    repo;
    logger = new common_1.Logger(SettingsService_1.name);
    constructor(repo) {
        this.repo = repo;
    }
    async getAll() {
        const settings = await this.repo.find();
        return settings.reduce((acc, s) => ({ ...acc, [s.key]: (s.value || '').trim() }), {});
    }
    async update(key, value) {
        let setting = await this.repo.findOne({ where: { key } });
        if (setting) {
            setting.value = value;
        }
        else {
            setting = this.repo.create({ key, value });
        }
        return this.repo.save(setting);
    }
    async testConnection(type) {
        const settings = await this.getAll();
        try {
            switch (type) {
                case 'ocr': return await this.testOcr(settings);
                case 'ai_recognition': return await this.testAiApi(settings, 'ai_recognition');
                case 'oe_lookup': return await this.testAiApi(settings, 'oe_lookup');
                default: return { success: false, message: `未知的测试类型: ${type}` };
            }
        }
        catch (error) {
            this.logger.error(`Test connection failed: ${error.message}`);
            return { success: false, message: `连接失败: ${error.message}` };
        }
    }
    async testOcr(settings) {
        const ocrType = settings.ocr_api_type || 'tesseract';
        switch (ocrType) {
            case 'tesseract': return { success: true, message: '本地引擎，无需测试' };
            case 'baidu': return this.testBaiduOcr(settings);
            case 'tencent': return this.testTencentOcr(settings);
            case 'aliyun': return this.testAliyunOcr(settings);
            case 'custom': return this.testCustomOcr(settings);
            default: return { success: false, message: `不支持的 OCR 引擎: ${ocrType}` };
        }
    }
    async testBaiduOcr(settings) {
        const apiKey = settings.ocr_api_key;
        const secretKey = settings.ocr_api_secret;
        if (!apiKey || !secretKey)
            return { success: false, message: '请填写 API Key 和 Secret Key' };
        const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();
        if (data.access_token) {
            return { success: true, message: `连接成功，Token 获取成功` };
        }
        return { success: false, message: `认证失败: ${data.error_description || data.error || '未知错误'}` };
    }
    async testTencentOcr(settings) {
        const secretId = settings.ocr_api_key;
        const secretKey = settings.ocr_api_secret;
        if (!secretId || !secretKey)
            return { success: false, message: '请填写 SecretId 和 SecretKey' };
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
        const service = 'ocr';
        const action = 'GeneralBasicOCR';
        const version = '2018-11-19';
        const region = 'ap-guangzhou';
        const payload = JSON.stringify({ ImageBase64: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsM' });
        const contentType = 'application/json; charset=utf-8';
        const canonicalHeaders = `content-type:${contentType}\nhost:${service}.tencentcloudapi.com\nx-tc-action:${action.toLowerCase()}\n`;
        const signedHeaders = 'content-type;host;x-tc-action';
        const hashedPayload = await this.sha256Hex(payload);
        const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;
        const credentialScope = `${date}/${service}/tc3_request`;
        const hashedCanonicalRequest = await this.sha256Hex(canonicalRequest);
        const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
        const secretDate = await this.hmacSha256Bytes(`TC3${secretKey}`, date);
        const secretService = await this.hmacSha256Bytes(secretDate, service);
        const secretSigning = await this.hmacSha256Bytes(secretService, 'tc3_request');
        const signature = await this.hmacSha256Hex(secretSigning, stringToSign);
        const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
        const response = await fetch(`https://${service}.tencentcloudapi.com`, {
            method: 'POST',
            headers: { 'Content-Type': contentType, 'Authorization': authorization, 'X-TC-Action': action, 'X-TC-Version': version, 'X-TC-Timestamp': String(timestamp), 'X-TC-Region': region },
            body: payload,
        });
        const data = await response.json();
        if (data.Response?.Error) {
            return { success: false, message: `认证失败: ${data.Response.Error.Code} - ${data.Response.Error.Message}` };
        }
        return { success: true, message: '连接成功，腾讯云 OCR 认证通过' };
    }
    async testAliyunOcr(settings) {
        const accessKeyId = settings.ocr_api_key;
        const accessKeySecret = settings.ocr_api_secret;
        if (!accessKeyId || !accessKeySecret)
            return { success: false, message: '请填写 AccessKey ID 和 AccessKey Secret' };
        const params = {
            Action: 'RecognizeGeneral', Version: '2021-07-07', Format: 'JSON',
            AccessKeyId: accessKeyId, SignatureMethod: 'HMAC-SHA1',
            Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
            SignatureVersion: '1.0', SignatureNonce: String(Date.now()),
        };
        const bodyParams = { ImageBase64: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAM' };
        const allParams = { ...params, ...bodyParams };
        const sortedKeys = Object.keys(allParams).sort();
        const canonicalQuery = sortedKeys.map(k => `${this.percentEncode(k)}=${this.percentEncode(allParams[k])}`).join('&');
        const stringToSign = `POST&${this.percentEncode('/')}&${this.percentEncode(canonicalQuery)}`;
        const signature = await this.hmacSha1Base64(`${accessKeySecret}&`, stringToSign);
        params.Signature = signature;
        const finalQuery = Object.keys(params).sort().map(k => `${this.percentEncode(k)}=${this.percentEncode(params[k])}`).join('&');
        const response = await fetch(`https://ocr-api.cn-hangzhou.aliyuncs.com/?${finalQuery}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: Object.entries(bodyParams).map(([k, v]) => `${this.percentEncode(k)}=${this.percentEncode(v)}`).join('&'),
        });
        const data = await response.json();
        if (data.Code) {
            return { success: false, message: `认证失败: ${data.Code} - ${data.Message}` };
        }
        return { success: true, message: '连接成功，阿里云 OCR 认证通过' };
    }
    async testCustomOcr(settings) {
        const apiUrl = settings.ocr_api_url;
        if (!apiUrl)
            return { success: false, message: '请填写 API URL' };
        const headers = { 'Content-Type': 'application/json' };
        const apiKey = settings.ocr_api_key;
        if (apiKey)
            headers['Authorization'] = `Bearer ${apiKey}`;
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify({ test: true }) });
            if (response.ok || response.status === 400) {
                return { success: true, message: `连接成功 (HTTP ${response.status})` };
            }
            return { success: false, message: `连接失败: HTTP ${response.status} ${response.statusText}` };
        }
        catch (error) {
            return { success: false, message: `无法连接: ${error.message}` };
        }
    }
    async testAiApi(settings, prefix) {
        const apiType = settings[`${prefix}_api_type`] || 'zhipu';
        const apiKey = settings[`${prefix}_api_key`];
        const apiUrl = settings[`${prefix}_api_url`];
        const model = settings[`${prefix}_model`];
        if (!apiKey)
            return { success: false, message: '请填写 API Key' };
        if (apiType === 'anthropic') {
            return this.testAnthropicApi(apiKey, apiUrl || 'https://api.anthropic.com/v1/messages', model || 'claude-sonnet-4-20250514');
        }
        const PROVIDER_URLS = {
            zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            deepseek: 'https://api.deepseek.com/v1/chat/completions',
            qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            doubao: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            hunyuan: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions',
            kimi: 'https://api.moonshot.cn/v1/chat/completions',
            mimo: 'https://api.xiaomi.com/v1/chat/completions',
            bailian: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            volcengine: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            openai: 'https://api.openai.com/v1/chat/completions',
        };
        const url = apiUrl || PROVIDER_URLS[apiType] || '';
        if (!url)
            return { success: false, message: '请填写 API URL' };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: model || 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }),
        });
        if (response.ok) {
            return { success: true, message: `连接成功 (HTTP ${response.status})` };
        }
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error?.message || data.message || response.statusText;
        return { success: false, message: `认证失败: ${errMsg}` };
    }
    async testAnthropicApi(apiKey, apiUrl, model) {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'hi' }] }),
        });
        if (response.ok) {
            return { success: true, message: `连接成功 (HTTP ${response.status})` };
        }
        const data = await response.json().catch(() => ({}));
        const errMsg = data.error?.message || response.statusText;
        return { success: false, message: `认证失败: ${errMsg}` };
    }
    async sha256Hex(message) {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(message));
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async hmacSha256Bytes(key, message) {
        const encoder = new TextEncoder();
        const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
        const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer.buffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
    }
    async hmacSha256Hex(key, message) {
        const encoder = new TextEncoder();
        const cryptoKey = await crypto.subtle.importKey('raw', key.buffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
        return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async hmacSha1Base64(key, message) {
        const encoder = new TextEncoder();
        const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    }
    percentEncode(str) {
        return encodeURIComponent(str).replace(/%20/g, '+').replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = SettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(setting_entity_1.Setting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SettingsService);
//# sourceMappingURL=settings.service.js.map