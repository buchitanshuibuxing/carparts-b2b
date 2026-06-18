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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const promises_1 = __importDefault(require("fs/promises"));
const settings_service_1 = require("../settings/settings.service");
let OcrService = OcrService_1 = class OcrService {
    settingsSvc;
    logger = new common_1.Logger(OcrService_1.name);
    baiduTokenCache = null;
    constructor(settingsSvc) {
        this.settingsSvc = settingsSvc;
    }
    async recognizeText(imagePath) {
        const settings = await this.settingsSvc.getAll();
        if (settings.ocr_enabled === 'false') {
            return { text: '', status: 'skipped' };
        }
        const ocrType = settings.ocr_api_type || 'tesseract';
        this.logger.log(`[OCR] Using engine: ${ocrType}`);
        try {
            switch (ocrType) {
                case 'baidu':
                    return await this.baiduOCR(imagePath, settings);
                case 'tencent':
                    return await this.tencentOCR(imagePath, settings);
                case 'aliyun':
                    return await this.aliyunOCR(imagePath, settings);
                case 'custom':
                    return await this.customOCR(imagePath, settings);
                default:
                    return await this.tesseractOCR(imagePath);
            }
        }
        catch (error) {
            this.logger.error(`OCR failed (${ocrType}) for ${imagePath}: ${error.message}`);
            return { text: '', status: 'error' };
        }
    }
    async tesseractOCR(imagePath) {
        const result = await tesseract_js_1.default.recognize(imagePath, 'eng+chi_sim', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    this.logger.debug(`Tesseract progress: ${Math.round(m.progress * 100)}%`);
                }
            },
        });
        return { text: result.data.text.trim(), status: 'done' };
    }
    async baiduOCR(imagePath, settings) {
        const apiKey = settings.ocr_api_key;
        const secretKey = settings.ocr_api_secret;
        if (!apiKey || !secretKey) {
            this.logger.warn('Baidu OCR: missing API Key or Secret Key');
            return { text: '', status: 'skipped' };
        }
        const token = await this.getBaiduAccessToken(apiKey, secretKey);
        if (!token) {
            return { text: '', status: 'error' };
        }
        const imageBuffer = await promises_1.default.readFile(imagePath);
        const base64 = imageBuffer.toString('base64');
        this.logger.log(`[Baidu OCR] Image size: ${imageBuffer.length} bytes, base64 length: ${base64.length}`);
        const apiUrl = settings.ocr_api_url || 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic';
        const fullUrl = `${apiUrl}?access_token=${token}`;
        this.logger.log(`[Baidu OCR] Calling: ${apiUrl}`);
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: `image=${encodeURIComponent(base64)}`,
        });
        this.logger.log(`[Baidu OCR] Response status: ${response.status}`);
        const data = await response.json();
        if (data.error_code) {
            this.logger.error(`[Baidu OCR] Error: ${data.error_code} - ${data.error_msg}`);
            return { text: '', status: 'error' };
        }
        const words = (data.words_result || []).map((item) => item.words);
        const text = words.join('\n');
        this.logger.log(`[Baidu OCR] Recognized ${words.length} lines`);
        return { text, status: 'done' };
    }
    async getBaiduAccessToken(apiKey, secretKey) {
        if (this.baiduTokenCache && this.baiduTokenCache.expiresAt > Date.now()) {
            return this.baiduTokenCache.token;
        }
        try {
            const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
            const response = await fetch(url, { method: 'POST' });
            const data = await response.json();
            if (data.access_token) {
                this.baiduTokenCache = {
                    token: data.access_token,
                    expiresAt: Date.now() + (data.expires_in - 3600) * 1000,
                };
                this.logger.log('[Baidu OCR] Access token obtained');
                return data.access_token;
            }
            this.logger.error(`Baidu token error: ${JSON.stringify(data)}`);
            return null;
        }
        catch (error) {
            this.logger.error(`Baidu token request failed: ${error.message}`);
            return null;
        }
    }
    async tencentOCR(imagePath, settings) {
        const secretId = settings.ocr_api_key;
        const secretKey = settings.ocr_api_secret;
        if (!secretId || !secretKey) {
            this.logger.warn('Tencent OCR: missing SecretId or SecretKey');
            return { text: '', status: 'skipped' };
        }
        const imageBuffer = await promises_1.default.readFile(imagePath);
        const base64 = imageBuffer.toString('base64');
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
        const service = 'ocr';
        const action = 'GeneralBasicOCR';
        const version = '2018-11-19';
        const region = 'ap-guangzhou';
        const payload = JSON.stringify({ ImageBase64: base64 });
        const contentType = 'application/json; charset=utf-8';
        const canonicalUri = '/';
        const canonicalQueryString = '';
        const canonicalHeaders = `content-type:${contentType}\nhost:${service}.tencentcloudapi.com\nx-tc-action:${action.toLowerCase()}\n`;
        const signedHeaders = 'content-type;host;x-tc-action';
        const hashedPayload = await this.sha256Hex(payload);
        const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;
        const algorithm = 'TC3-HMAC-SHA256';
        const credentialScope = `${date}/${service}/tc3_request`;
        const hashedCanonicalRequest = await this.sha256Hex(canonicalRequest);
        const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;
        const secretDate = await this.hmacSha256Bytes(`TC3${secretKey}`, date);
        const secretService = await this.hmacSha256Bytes(secretDate, service);
        const secretSigning = await this.hmacSha256Bytes(secretService, 'tc3_request');
        const signature = await this.hmacSha256Hex(secretSigning, stringToSign);
        const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
        const response = await fetch(`https://${service}.tencentcloudapi.com`, {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                'Authorization': authorization,
                'X-TC-Action': action,
                'X-TC-Version': version,
                'X-TC-Timestamp': String(timestamp),
                'X-TC-Region': region,
            },
            body: payload,
        });
        const data = await response.json();
        const result = data.Response;
        if (result.Error) {
            this.logger.error(`Tencent OCR error: ${result.Error.Code} - ${result.Error.Message}`);
            return { text: '', status: 'error' };
        }
        const texts = (result.TextDetections || []).map((item) => item.DetectedText);
        const text = texts.join('\n');
        this.logger.log(`[Tencent OCR] Recognized ${texts.length} lines`);
        return { text, status: 'done' };
    }
    async aliyunOCR(imagePath, settings) {
        const accessKeyId = settings.ocr_api_key;
        const accessKeySecret = settings.ocr_api_secret;
        if (!accessKeyId || !accessKeySecret) {
            this.logger.warn('Aliyun OCR: missing AccessKeyId or AccessKeySecret');
            return { text: '', status: 'skipped' };
        }
        const imageBuffer = await promises_1.default.readFile(imagePath);
        const base64 = imageBuffer.toString('base64');
        const params = {
            Action: 'RecognizeGeneral',
            Version: '2021-07-07',
            Format: 'JSON',
            AccessKeyId: accessKeyId,
            SignatureMethod: 'HMAC-SHA1',
            Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
            SignatureVersion: '1.0',
            SignatureNonce: String(Date.now()),
        };
        const bodyParams = { ImageBase64: base64 };
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
            this.logger.error(`Aliyun OCR error: ${data.Code} - ${data.Message}`);
            return { text: '', status: 'error' };
        }
        const text = data.Data?.Content || '';
        this.logger.log(`[Aliyun OCR] Recognized ${text.length} chars`);
        return { text, status: 'done' };
    }
    async customOCR(imagePath, settings) {
        const apiUrl = settings.ocr_api_url;
        const apiKey = settings.ocr_api_key;
        if (!apiUrl) {
            this.logger.warn('Custom OCR: missing API URL');
            return { text: '', status: 'skipped' };
        }
        const imageBuffer = await promises_1.default.readFile(imagePath);
        const base64 = imageBuffer.toString('base64');
        const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey)
            headers['Authorization'] = `Bearer ${apiKey}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                image: base64,
                image_url: `data:${mimeType};base64,${base64}`,
            }),
        });
        const data = await response.json();
        const text = data.text || data.result || data.content || data.data?.text || JSON.stringify(data);
        return { text: String(text).trim(), status: 'done' };
    }
    async sha256Hex(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async hmacSha256Bytes(key, message) {
        const encoder = new TextEncoder();
        const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
        const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer.buffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
        return new Uint8Array(signature);
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
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], OcrService);
//# sourceMappingURL=ocr.service.js.map