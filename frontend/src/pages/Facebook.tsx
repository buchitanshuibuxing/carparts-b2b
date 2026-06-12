import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Send, Clock, Image, ThumbsUp, MessageSquare, Share2, X, Check, Search, Copy, Edit3, Type, Droplet, Save, FileText, Trash2, Download } from 'lucide-react';
import JSZip from 'jszip';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

import { useToast } from '@/components/ui/Toast';
interface FbPage {
  id: number;
  page_id: string;
  page_name: string;
  is_active: boolean;
}

interface FbPost {
  id: number;
  page_id: number;
  message: string;
  image_asset_ids: number[];
  status: string;
  scheduled_at?: string;
  published_at?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  error_message: string;
  created_at: string;
}

interface AssetItem {
  id: number;
  fileName: string;
  type: string;
  thumbnailMediumPath: string;
  filePath: string;
}

interface Classification {
  id: number;
  name: string;
}

const POST_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'gray' },
  scheduled: { label: '待发布', color: 'yellow' },
  published: { label: '已发布', color: 'green' },
  failed: { label: '失败', color: 'red' },
};

// Image Collage Generator Component
function ImageCollageGenerator({ images, onSave, onClose }: { images: { url: string; name: string }[]; onSave: (dataUrl: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<'grid' | 'horizontal' | 'vertical' | 'comparison'>('grid');
  const [gap, setGap] = useState(4);
  const [bgColor, setBgColor] = useState('#ffffff');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !images.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgElements: HTMLImageElement[] = [];
    let loaded = 0;

    const drawCollage = () => {
      if (loaded < images.length) return;

      // Calculate dimensions
      let width = 800;
      let height = 600;

      if (layout === 'horizontal') {
        width = images.length * 300;
        height = 400;
      } else if (layout === 'vertical') {
        width = 400;
        height = images.length * 300;
      } else if (layout === 'comparison') {
        width = 800;
        height = 400;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Draw images
      const count = Math.min(images.length, 9); // Max 9 images
      const cols = layout === 'grid' ? Math.ceil(Math.sqrt(count)) : count;
      const rows = layout === 'grid' ? Math.ceil(count / cols) : 1;

      const cellWidth = (width - gap * (cols + 1)) / cols;
      const cellHeight = (height - gap * (rows + 1)) / rows;

      imgElements.forEach((img, idx) => {
        if (idx >= count) return;

        const col = layout === 'grid' ? idx % cols : idx;
        const row = layout === 'grid' ? Math.floor(idx / cols) : 0;

        const x = gap + col * (cellWidth + gap);
        const y = gap + row * (cellHeight + gap);

        // Draw image
        ctx.drawImage(img, x, y, cellWidth, cellHeight);

        // Draw border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);
      });
    };

    images.forEach((imgData, idx) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgElements[idx] = img;
        loaded++;
        drawCollage();
      };
      img.src = imgData.url;
    });
  }, [images, layout, gap, bgColor]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {/* Canvas preview */}
        <div className="flex-1">
          <canvas ref={canvasRef} className="max-w-full border rounded-lg shadow-lg" />
        </div>

        {/* Controls */}
        <div className="w-64 space-y-4">
          <div>
            <label className="text-sm font-medium">布局方式</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { key: 'grid', label: '九宫格' },
                { key: 'horizontal', label: '横向' },
                { key: 'vertical', label: '纵向' },
                { key: 'comparison', label: '对比' },
              ].map(l => (
                <button
                  key={l.key}
                  onClick={() => setLayout(l.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${layout === l.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >{l.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">间距</label>
            <input
              type="range"
              min="0"
              max="20"
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              className="w-full mt-2"
            />
            <span className="text-xs text-gray-500">{gap}px</span>
          </div>

          <div>
            <label className="text-sm font-medium">背景颜色</label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-full mt-2 h-8 rounded border border-gray-200"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
            <Button onClick={handleSave} className="flex-1">保存图片</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Card Generator Component
function ProductCardGenerator({ parts, onSave, onClose }: { parts: any[]; onSave: (dataUrl: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardStyle, setCardStyle] = useState<'modern' | 'classic' | 'minimal'>('modern');
  const [showPrice, setShowPrice] = useState(false);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parts.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Draw background
    if (cardStyle === 'modern') {
      const gradient = ctx.createLinearGradient(0, 0, 800, 600);
      gradient.addColorStop(0, '#1e40af');
      gradient.addColorStop(1, '#3b82f6');
      ctx.fillStyle = gradient;
    } else if (cardStyle === 'classic') {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#f8fafc';
    }
    ctx.fillRect(0, 0, 800, 600);

    // Draw content
    const textColor = cardStyle === 'modern' ? '#ffffff' : '#1f2937';
    const accentColor = cardStyle === 'modern' ? '#93c5fd' : '#2563eb';

    // Title
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText('AUTO PARTS', 400, 50);

    // Product info
    const startY = 100;
    const lineHeight = 35;

    parts.slice(0, 4).forEach((part, idx) => {
      const y = startY + idx * lineHeight * 3;

      // OE Number
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = accentColor;
      ctx.textAlign = 'left';
      ctx.fillText(`OE: ${part.oeNumber || '-'}`, 50, y);

      // Part Name
      ctx.font = '18px Arial';
      ctx.fillStyle = textColor;
      ctx.fillText(`${part.partNameEn || part.partNameCn || '-'}`, 50, y + lineHeight);

      // Brand
      ctx.font = '14px Arial';
      ctx.fillStyle = cardStyle === 'modern' ? '#bfdbfe' : '#6b7280';
      ctx.fillText(`Brand: ${part.brand || '-'}`, 50, y + lineHeight * 2);
    });

    // Price if enabled
    if (showPrice && price) {
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = cardStyle === 'modern' ? '#86efac' : '#16a34a';
      ctx.textAlign = 'center';
      ctx.fillText(`${currency} ${price}`, 400, 520);
    }

    // Footer
    ctx.font = '12px Arial';
    ctx.fillStyle = cardStyle === 'modern' ? '#93c5fd' : '#9ca3af';
    ctx.textAlign = 'center';
    ctx.fillText('Contact us for pricing and availability', 400, 570);

  }, [parts, cardStyle, showPrice, price, currency]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {/* Canvas preview */}
        <div className="flex-1">
          <canvas ref={canvasRef} className="max-w-full border rounded-lg shadow-lg" />
        </div>

        {/* Controls */}
        <div className="w-64 space-y-4">
          <div>
            <label className="text-sm font-medium">卡片样式</label>
            <div className="flex gap-2 mt-2">
              {[
                { key: 'modern', label: '现代' },
                { key: 'classic', label: '经典' },
                { key: 'minimal', label: '简约' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setCardStyle(s.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${cardStyle === s.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >{s.label}</button>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded" />
              <span className="text-sm">显示价格</span>
            </label>
            {showPrice && (
              <div className="mt-2 flex gap-2">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-2 py-1.5 rounded border border-gray-200 text-sm">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="CNY">CNY</option>
                </select>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="价格"
                  className="flex-1 px-3 py-1.5 rounded border border-gray-200 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
            <Button onClick={handleSave} className="flex-1">保存图片</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Image Editor Component
function ImageEditor({ imageUrl, onSave, onClose }: { imageUrl: string; onSave: (dataUrl: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState('');
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(100);
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [showWatermark, setShowWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [imgSize, setImgSize] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      setImgSize({ width: img.width, height: img.height });
      ctx.drawImage(img, 0, 0);

      // Add watermark if enabled
      if (showWatermark && watermarkText) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.font = '20px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-45 * Math.PI / 180);
        ctx.fillText(watermarkText, -ctx.measureText(watermarkText).width / 2, 0);
        ctx.restore();
      }

      // Add text overlay
      if (text) {
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = fontColor;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(text, textX, textY);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, text, textX, textY, fontSize, fontColor, showWatermark, watermarkText]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4" style={{ maxHeight: '70vh' }}>
        {/* Canvas preview - takes most space */}
        <div className="flex-1 min-w-0 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="max-w-full max-h-[65vh] object-contain" />
        </div>

        {/* Controls - compact sidebar */}
        <div className="w-56 space-y-3 flex-shrink-0 overflow-auto" style={{ maxHeight: '65vh' }}>
          <div>
            <label className="text-sm font-medium">文字</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入文字..."
              className="w-full mt-1 px-2 py-1.5 rounded border border-gray-200 text-sm"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-500">X</label>
              <span className="text-xs text-gray-400">{textX}</span>
            </div>
            <input type="range" min="0" max={imgSize.width} value={textX} onChange={(e) => setTextX(Number(e.target.value))} className="w-full" />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-500">Y</label>
              <span className="text-xs text-gray-400">{textY}</span>
            </div>
            <input type="range" min="0" max={imgSize.height} value={textY} onChange={(e) => setTextY(Number(e.target.value))} className="w-full" />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-500">字号</label>
              <span className="text-xs text-gray-400">{fontSize}px</span>
            </div>
            <input type="range" min="12" max="500" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full" />
          </div>

          <div>
            <label className="text-xs text-gray-500">颜色</label>
            <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="w-full h-7 rounded border border-gray-200 mt-1" />
          </div>

          <div className="border-t pt-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showWatermark} onChange={(e) => setShowWatermark(e.target.checked)} className="rounded" />
              水印
            </label>
            {showWatermark && (
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="水印文字..."
                className="w-full mt-1 px-2 py-1.5 rounded border border-gray-200 text-sm"
              />
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1 text-sm py-1.5">取消</Button>
            <Button onClick={handleSave} className="flex-1 text-sm py-1.5">保存</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Batch Watermark Modal Component
function BatchWatermarkModal({ imageCount, previewUrl, onApply, onClose, processing, onConfigChange, progress }: {
  imageCount: number;
  previewUrl: string;
  onApply: () => void;
  onClose: () => void;
  processing: boolean;
  onConfigChange: (config: { text: string; position: string; fontSize: number; opacity: number; rotation: number }) => void;
  progress: { current: number; total: number; done: boolean } | null;
}) {
  const textRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
  const [fontSize, setFontSize] = useState(36);
  const [opacity, setOpacity] = useState(0.7);
  const [rotation, setRotation] = useState(-30);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const updateTimerRef = useRef<any>(null);

  // Debounced preview update
  const updatePreview = () => {
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !previewUrl) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 500;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const text = textRef.current?.value || '';
        if (text) {
          ctx.globalAlpha = opacity;
          const scaledFontSize = Math.max(fontSize * scale, 12);
          ctx.font = `bold ${scaledFontSize}px Arial`;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          const padding = 20;
          let x = 0, y = 0;
          const textWidth = ctx.measureText(text).width;

          switch (position) {
            case 'bottom-right':
              x = canvas.width - textWidth - padding;
              y = canvas.height - padding;
              break;
            case 'bottom-left':
              x = padding;
              y = canvas.height - padding;
              break;
            case 'top-right':
              x = canvas.width - textWidth - padding;
              y = scaledFontSize + padding;
              break;
            case 'top-left':
              x = padding;
              y = scaledFontSize + padding;
              break;
            case 'center':
              x = (canvas.width - textWidth) / 2;
              y = canvas.height / 2;
              break;
          }

          // Apply rotation
          ctx.save();
          ctx.translate(x + textWidth / 2, y - scaledFontSize / 3);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.fillText(text, -textWidth / 2, scaledFontSize / 3);
          ctx.restore();
        }
      };
      img.src = previewUrl;
    }, 50);
  };

  // Update preview when any config changes
  useEffect(() => { updatePreview(); }, [previewUrl, position, fontSize, opacity, rotation]);

  const handleApply = () => {
    const text = textRef.current?.value || '';
    if (!text.trim()) return;
    onConfigChange({ text, position: position as string, fontSize, opacity, rotation });
    onApply();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="批量添加水印" size="3xl">
      <div className="flex gap-6" style={{ minHeight: '550px' }}>
        {/* Left: Preview */}
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">预览效果</label>
          <div className="border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{ minHeight: '500px' }}>
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
          </div>
          <p className="text-xs text-gray-400 mt-1">预览仅供参考，实际效果以原图为准</p>
        </div>

        {/* Right: Settings */}
        <div className="w-80 space-y-4">
          <div>
            <label className="text-sm font-medium">水印文字 *</label>
            <input
              type="text"
              ref={textRef}
              defaultValue=""
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              placeholder="如：公司名称、网址..."
              onInput={updatePreview}
            />
          </div>

          <div>
            <label className="text-sm font-medium">水印位置</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { key: 'top-left', label: '↖ 左上' },
                { key: 'top-right', label: '↗ 右上' },
                { key: 'center', label: '⊕ 居中' },
                { key: 'bottom-left', label: '↙ 左下' },
                { key: 'bottom-right', label: '↘ 右下' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setPosition(p.key as any)}
                  className={`px-3 py-2 rounded-lg text-xs ${position === p.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium">字体大小</label>
              <span className="text-sm text-gray-500">{fontSize}px</span>
            </div>
            <input
              type="range"
              min="16"
              max="500"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium">透明度</label>
              <span className="text-sm text-gray-500">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={opacity * 100}
              onChange={(e) => setOpacity(Number(e.target.value) / 100)}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium">旋转角度</label>
              <span className="text-sm text-gray-500">{rotation}°</span>
            </div>
            <input
              type="range"
              min="-90"
              max="90"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>-90°</span>
              <button onClick={() => setRotation(0)} className="text-blue-500 hover:underline">重置</button>
              <span>90°</span>
            </div>
          </div>

          {/* Progress */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.done ? '✅ 完成' : '处理中...'}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${progress.done ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${(progress.current / progress.total * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <Button variant="secondary" onClick={onClose} className="flex-1" disabled={processing}>
              {progress?.done ? '关闭' : '取消'}
            </Button>
            {!progress?.done && (
              <Button onClick={handleApply} disabled={processing || !textRef.current?.value?.trim()} className="flex-1">
                {processing ? '处理中...' : `添加水印 (${imageCount}张)`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Copy Button Component with status feedback
function CopyButton({ onClick, label, successLabel, className = '' }: {
  onClick: () => Promise<void>;
  label: string;
  successLabel: string;
  className?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    setStatus('copying');
    try {
      await onClick();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === 'copying'}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
        status === 'success' ? 'bg-green-100 text-green-700' :
        status === 'error' ? 'bg-red-100 text-red-700' :
        status === 'copying' ? 'bg-gray-100 text-gray-400' :
        'bg-blue-50 text-blue-600 hover:bg-blue-100'
      } ${className}`}
    >
      {status === 'success' && <Check size={12} />}
      {status === 'error' && <X size={12} />}
      {status === 'copying' ? '复制中...' : status === 'success' ? successLabel : status === 'error' ? '失败' : label}
    </button>
  );
}

// Standalone post creator component to avoid cursor issues
function PostCreator({ onClose }: { onClose: () => void }) {
  const { success, error, warning } = useToast();
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [generatedText, setGeneratedText] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerAssets, setPickerAssets] = useState<any[]>([]);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerKeyword, setPickerKeyword] = useState('');
  const [pickerSelected, setPickerSelected] = useState<Set<number>>(new Set());
  const [classifications, setClassifications] = useState<any[]>([]);
  const [pickerClassId, setPickerClassId] = useState('');
  const [copying, setCopying] = useState<'image' | 'text' | 'success' | 'error' | 'text-success' | null>(null);
  const [templateType, setTemplateType] = useState<'product' | 'promo' | 'new'>('product');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [textSource, setTextSource] = useState<'ai' | 'template' | 'manual' | null>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);
  const translateTimerRef = useRef<any>(null);
  const [editingImage, setEditingImage] = useState<any>(null);
  const [editedImages, setEditedImages] = useState<Record<number, string>>({});
  const [showCardGenerator, setShowCardGenerator] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<string[]>([]);
  const [showCollageGenerator, setShowCollageGenerator] = useState(false);
  const [generatedCollages, setGeneratedCollages] = useState<string[]>([]);

  // Batch generation
  const [showBatchGenerator, setShowBatchGenerator] = useState(false);
  const [batchResults, setBatchResults] = useState<{ text: string; image: any }[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Batch watermark
  const [showBatchWatermark, setShowBatchWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkPosition, setWatermarkPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
  const [watermarkFontSize, setWatermarkFontSize] = useState(36);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.7);
  const [watermarkRotation, setWatermarkRotation] = useState(-30);
  const [watermarkProcessing, setWatermarkProcessing] = useState(false);

  // Drafts and Templates
  const [drafts, setDrafts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Load drafts and templates from localStorage
  useEffect(() => {
    try {
      const savedDrafts = localStorage.getItem('fb_drafts');
      if (savedDrafts) setDrafts(JSON.parse(savedDrafts));
      const savedTemplates = localStorage.getItem('fb_templates');
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    } catch {}
  }, []);

  const saveDraft = () => {
    const draft = {
      id: Date.now(),
      text: generatedText,
      images: selectedImages.map(img => ({ id: img.id, name: img.fileName })),
      createdAt: new Date().toISOString(),
    };
    const updated = [draft, ...drafts];
    setDrafts(updated);
    localStorage.setItem('fb_drafts', JSON.stringify(updated));
    success('草稿已保存！');
  };

  const loadDraft = (draft: any) => {
    setGeneratedText(draft.text);
    // Note: We can't restore images from draft, only text
    setShowDrafts(false);
  };

  const deleteDraft = (id: number) => {
    const updated = drafts.filter(d => d.id !== id);
    setDrafts(updated);
    localStorage.setItem('fb_drafts', JSON.stringify(updated));
  };

  const saveTemplate = () => {
    if (!templateName.trim()) return;
    const template = {
      id: Date.now(),
      name: templateName,
      text: generatedText,
      createdAt: new Date().toISOString(),
    };
    const updated = [template, ...templates];
    setTemplates(updated);
    localStorage.setItem('fb_templates', JSON.stringify(updated));
    setTemplateName('');
    setShowSaveTemplate(false);
    success('模板已保存！');
  };

  const loadTemplate = (template: any) => {
    setGeneratedText(template.text);
    setShowTemplates(false);
  };

  const deleteTemplate = (id: number) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem('fb_templates', JSON.stringify(updated));
  };

  const generateBatchPosts = async () => {
    if (!selectedImages.length) return;
    setBatchGenerating(true);
    setBatchResults([]);

    const results: { text: string; image: any }[] = [];

    for (const img of selectedImages) {
      try {
        const { data } = await api.post('/facebook/generate-post', {
          asset_ids: [img.id],
          template: templateType,
        });
        results.push({ text: data.text || '', image: img });
      } catch {
        // Fallback
        const oe = img.recognizedOeNumber || '';
        const name = img.partNameEn || img.partNameCn || '';
        let text = `🔧 ${name || 'Auto Part'}\n`;
        if (oe) text += `OE: ${oe}\n`;
        text += `\n📩 Contact us for pricing!\n#autoparts`;
        results.push({ text, image: img });
      }
    }

    setBatchResults(results);
    setBatchGenerating(false);
    setShowBatchGenerator(true);
  };

  const copyBatchPost = async (text: string, image: any) => {
    try {
      // Copy text
      await navigator.clipboard.writeText(text);
      // Copy image
      const response = await fetch(imageUrl(image.filePath));
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      success('图片和文案已复制到剪贴板！');
    } catch (err) {
      success('复制失败');
    }
  };

  const addWatermarkToImage = (imgUrl: string, text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('Canvas not supported'); return; }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Configure watermark
        ctx.globalAlpha = watermarkOpacity;
        ctx.font = `bold ${watermarkFontSize}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Calculate position
        const padding = 20;
        let x = 0, y = 0;
        const textWidth = ctx.measureText(text).width;

        switch (watermarkPosition) {
          case 'bottom-right':
            x = canvas.width - textWidth - padding;
            y = canvas.height - padding;
            break;
          case 'bottom-left':
            x = padding;
            y = canvas.height - padding;
            break;
          case 'top-right':
            x = canvas.width - textWidth - padding;
            y = watermarkFontSize + padding;
            break;
          case 'top-left':
            x = padding;
            y = watermarkFontSize + padding;
            break;
          case 'center':
            x = (canvas.width - textWidth) / 2;
            y = canvas.height / 2;
            break;
        }

        // Apply rotation
        ctx.save();
        ctx.translate(x + textWidth / 2, y - watermarkFontSize / 3);
        ctx.rotate((watermarkRotation * Math.PI) / 180);
        ctx.fillText(text, -textWidth / 2, watermarkFontSize / 3);
        ctx.restore();

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = reject;
      img.src = imgUrl;
    });
  };

  const [watermarkProgress, setWatermarkProgress] = useState<{ current: number; total: number; done: boolean } | null>(null);

  const handleBatchWatermark = async () => {
    if (!watermarkText.trim() || !selectedImages.length) return;
    setWatermarkProcessing(true);
    setWatermarkProgress({ current: 0, total: selectedImages.length, done: false });

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        const imgSrc = imageUrl(img.filePath);
        const watermarked = await addWatermarkToImage(imgSrc, watermarkText);
        setEditedImages(prev => ({ ...prev, [img.id]: watermarked }));
        setWatermarkProgress({ current: i + 1, total: selectedImages.length, done: false });
      }
      setWatermarkProgress({ current: selectedImages.length, total: selectedImages.length, done: true });
      setTimeout(() => {
        setShowBatchWatermark(false);
        setWatermarkProgress(null);
      }, 2000);
    } catch (err) {
      success('添加水印失败');
    } finally {
      setWatermarkProcessing(false);
    }
  };

  const imageUrl = (path: string) => `/uploads/${path}`;

  const fetchPickerAssets = async (page: number, append = false) => {
    setPickerLoading(true);
    try {
      const params: any = { page, page_size: 20, type: 'image' };
      if (pickerKeyword) params.keyword = pickerKeyword;
      if (pickerClassId) params.classification_id = pickerClassId;
      const { data: res } = await api.get('/assets', { params });
      const result = res.data || res;
      setPickerTotal(result.total || 0);
      setPickerAssets(prev => append ? [...prev, ...(result.items || [])] : (result.items || []));
    } catch { /* ignore */ }
    finally { setPickerLoading(false); }
  };

  const fetchClassifications = async () => {
    try {
      const { data: res } = await api.get('/assets/meta/classifications');
      setClassifications(res.data || res || []);
    } catch { /* ignore */ }
  };

  const openPicker = () => {
    setPickerSelected(new Set(selectedImages.map(a => a.id)));
    setPickerPage(1);
    setPickerKeyword('');
    setPickerClassId('');
    setShowPicker(true);
    fetchClassifications();
    fetchPickerAssets(1);
  };

  // Reload when filters change
  useEffect(() => {
    if (!showPicker) return;
    const timer = setTimeout(() => {
      setPickerPage(1);
      fetchPickerAssets(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [pickerKeyword, pickerClassId, showPicker]);

  const togglePickerSelect = (asset: any) => {
    setPickerSelected(prev => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });
  };

  const confirmPicker = () => {
    const selected = pickerAssets.filter(a => pickerSelected.has(a.id));
    setSelectedImages(selected);
    setShowPicker(false);
    generateText(selected);
  };

  // Chinese to English mappings
  const BRAND_MAP: Record<string, string> = {
    '现代/起亚': 'Hyundai/Kia',
    '现代': 'Hyundai',
    '起亚': 'Kia',
    '丰田': 'Toyota',
    '本田': 'Honda',
    '日产': 'Nissan',
    '宝马': 'BMW',
    '奔驰': 'Mercedes-Benz',
    '大众': 'Volkswagen',
    '奥迪': 'Audi',
    '福特': 'Ford',
    '雪佛兰': 'Chevrolet',
    '别克': 'Buick',
    '凯迪拉克': 'Cadillac',
    '雷克萨斯': 'Lexus',
    '英菲尼迪': 'Infiniti',
    '马自达': 'Mazda',
    '三菱': 'Mitsubishi',
    '铃木': 'Suzuki',
    '斯巴鲁': 'Subaru',
  };

  const PART_NAME_EN_MAP: Record<string, string> = {
    '点火线圈': 'Ignition Coil',
    '散热器盖': 'Radiator Cap',
    '散热器': 'Radiator',
    '水泵': 'Water Pump',
    '节温器': 'Thermostat',
    '火花塞': 'Spark Plug',
    '刹车片': 'Brake Pad',
    '刹车盘': 'Brake Disc',
    '滤清器': 'Filter',
    '空气滤清器': 'Air Filter',
    '机油滤清器': 'Oil Filter',
    '燃油滤清器': 'Fuel Filter',
    '正时皮带': 'Timing Belt',
    '发电机': 'Alternator',
    '起动机': 'Starter Motor',
    '压缩机': 'Compressor',
    '冷凝器': 'Condenser',
    '蒸发器': 'Evaporator',
    '膨胀阀': 'Expansion Valve',
    '离合器': 'Clutch',
    '变速箱': 'Transmission',
    '变速箱油': 'Transmission Oil',
    '转向机': 'Steering Gear',
    '助力泵': 'Power Steering Pump',
    '减震器': 'Shock Absorber',
    '弹簧': 'Spring',
    '球头': 'Ball Joint',
    '拉杆': 'Tie Rod',
    '轴承': 'Bearing',
    '密封件': 'Seal',
    '垫片': 'Gasket',
    '油封': 'Oil Seal',
    '传感器': 'Sensor',
    '开关': 'Switch',
    '继电器': 'Relay',
    '保险丝': 'Fuse',
    '灯泡': 'Bulb',
    '大灯': 'Headlight',
    '尾灯': 'Tail Light',
    '转向灯': 'Turn Signal',
    '雨刮器': 'Wiper Blade',
    '雨刮电机': 'Wiper Motor',
    '玻璃升降器': 'Window Regulator',
    '门锁': 'Door Lock',
    '后视镜': 'Mirror',
    '保险杠': 'Bumper',
    '叶子板': 'Fender',
    '引擎盖': 'Hood',
    '排气管': 'Exhaust Pipe',
    '三元催化': 'Catalytic Converter',
    '氧传感器': 'Oxygen Sensor',
    '机油泵': 'Oil Pump',
    '燃油泵': 'Fuel Pump',
    '空调泵': 'A/C Compressor',
    '发电机皮带': 'Serpentine Belt',
    '涨紧器': 'Tensioner',
    '惰轮': 'Idler Pulley',
  };

  const translateBrand = (brand: string): string => {
    if (!brand) return '';
    if (/^[a-zA-Z\/\s\-]+$/.test(brand)) return brand;
    return BRAND_MAP[brand] || brand;
  };

  const translatePartName = (name: string): string => {
    if (!name) return '';
    if (/^[a-zA-Z\s\-]+$/.test(name)) return name;
    // Exact match first
    if (PART_NAME_EN_MAP[name]) return PART_NAME_EN_MAP[name];
    // Partial match
    for (const [cn, en] of Object.entries(PART_NAME_EN_MAP)) {
      if (name.includes(cn)) return en;
    }
    return name;
  };

  const generateText = (images: any[]) => {
    if (!images.length) {
      setGeneratedText('');
      setTextSource(null);
      return;
    }

    // Collect info in order (preserve selection order)
    const oeNumbers: string[] = [];
    const partNames: string[] = [];
    const brands = new Set<string>();
    const seenOe = new Set<string>();
    const seenNames = new Set<string>();

    images.forEach(img => {
      const oe = img.recognizedOeNumber;
      if (oe && !seenOe.has(oe)) {
        seenOe.add(oe);
        oeNumbers.push(oe);
        // Get name: English first, then translate Chinese
        let name = img.partNameEn || '';
        if (!name && img.partNameCn) {
          name = translatePartName(img.partNameCn);
        }
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          partNames.push(name);
        }
      }
      if (img.recognizedBrand) brands.add(translateBrand(img.recognizedBrand));
    });

    const brandStr = [...brands].join('/') || '';
    const nameStr = partNames.join(', ') || 'Auto Parts';

    // Generate hashtags (avoid duplicates)
    const hashtagSet = new Set<string>();
    hashtagSet.add('#AutoParts');
    hashtagSet.add('#Wholesale');
    hashtagSet.add('#OEQuality');
    if (brandStr) hashtagSet.add('#' + brandStr.replace(/[\s\/]+/g, ''));
    partNames.forEach(n => hashtagSet.add('#' + n.replace(/\s+/g, '')));
    // Only add first 3 OE hashtags to avoid clutter
    oeNumbers.slice(0, 3).forEach(oe => hashtagSet.add('#' + oe.replace(/-/g, '')));
    const hashtags = [...hashtagSet];

    let text = '';
    if (templateType === 'product') {
      // Title: Brand + Product Names
      text += `${brandStr ? brandStr + ' ' : ''}${nameStr} – Ready Stock\n\n`;
      // OE Numbers
      if (oeNumbers.length) {
        text += `OE Numbers:\n`;
        oeNumbers.forEach(oe => text += `${oe}\n`);
        text += `\n`;
      }
      // Marketing text
      text += `High quality genuine parts for wholesale.\n`;
      text += `Bulk orders welcome.\n\n`;
      // Hashtags
      text += hashtags.join(' ');
    } else if (templateType === 'promo') {
      text += `🔥 SPECIAL OFFER! 🔥\n\n`;
      text += `${brandStr ? brandStr + ' ' : ''}${nameStr}\n`;
      if (oeNumbers.length) {
        text += `OE: ${oeNumbers.join(', ')}\n`;
      }
      text += `\n💰 Best wholesale prices\n`;
      text += `📦 Free shipping on bulk orders\n`;
      text += `⏰ Limited stock!\n\n`;
      text += `DM for details!\n\n`;
      text += hashtags.join(' ');
    } else {
      text += `🆕 NEW ARRIVAL!\n\n`;
      text += `${brandStr ? brandStr + ' ' : ''}${nameStr} – Ready Stock\n`;
      if (oeNumbers.length) {
        text += `OE Numbers:\n`;
        oeNumbers.forEach(oe => text += `${oe}\n`);
      }
      text += `\nJust landed in our warehouse!\n`;
      text += `✅ Genuine quality\n✅ Ready to ship\n✅ Best prices\n\n`;
      text += `Contact us to order!\n\n`;
      text += hashtags.join(' ');
    }

    setGeneratedText(text);
    setTextSource('template');
  };

  const generateWithAI = async () => {
    if (!selectedImages.length) return;
    setGeneratingAI(true);
    try {
      const assetIds = selectedImages.map(img => img.id);
      const { data } = await api.post('/facebook/generate-post', {
        asset_ids: assetIds,
        template: templateType,
      });
      setGeneratedText(data.text || '');
      setTextSource('ai');
    } catch (err) {
      success('AI生成失败，已保留模板文案');
      setTextSource('template');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Debounced translation
  const translateText = async (text: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      return;
    }

    setTranslating(true);
    try {
      // Use axios which automatically includes auth token
      const { data } = await api.post('/facebook/translate', { text, target_lang: 'zh' });
      // data is a string (plain text response)
      setTranslatedText(typeof data === 'string' ? data : JSON.stringify(data));
    } catch {
      setTranslatedText('（翻译失败，请手动翻译）');
    } finally {
      setTranslating(false);
    }
  };

  // Watch for text changes and auto-translate
  useEffect(() => {
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
    if (generatedText.trim()) {
      translateTimerRef.current = setTimeout(() => {
        translateText(generatedText);
      }, 1500); // 1.5s debounce
    } else {
      setTranslatedText('');
    }
    return () => { if (translateTimerRef.current) clearTimeout(translateTimerRef.current); };
  }, [generatedText]);

  const [copyIndex, setCopyIndex] = useState(0);

  const copySingleImage = async (img: any) => {
    const imgSrc = editedImages[img.id] || imageUrl(img.filePath);
    const fullUrl = imgSrc.startsWith('data:') ? imgSrc : window.location.origin + imgSrc;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const imgEl = document.createElement('img');
    imgEl.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      imgEl.onload = () => resolve();
      imgEl.onerror = () => reject(new Error('Image load failed'));
      imgEl.src = fullUrl;
    });

    canvas.width = imgEl.width;
    canvas.height = imgEl.height;
    ctx.drawImage(imgEl, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas to blob failed'));
      }, 'image/png');
    });

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    } else {
      throw new Error('Clipboard not supported');
    }
  };

  const downloadSingleImage = async (img: any) => {
    const imgSrc = editedImages[img.id] || imageUrl(img.filePath);
    const fullUrl = imgSrc.startsWith('data:') ? imgSrc : window.location.origin + imgSrc;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    const imgEl = document.createElement('img');
    imgEl.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      imgEl.onload = () => resolve();
      imgEl.onerror = () => reject(new Error('Image load failed'));
      imgEl.src = fullUrl;
    });

    canvas.width = imgEl.width;
    canvas.height = imgEl.height;
    ctx.drawImage(imgEl, 0, 0);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = img.fileName || 'image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyImage = async () => {
    if (!selectedImages.length) return;
    setCopying('image');

    try {
      if (selectedImages.length === 1) {
        // Single image: copy to clipboard
        await copySingleImage(selectedImages[0]);
        setCopying('success');
      } else {
        // Multiple images: download as ZIP
        const zip = new JSZip();
        const folder = zip.folder('facebook_images')!;

        for (let i = 0; i < selectedImages.length; i++) {
          const img = selectedImages[i];
          const imgSrc = editedImages[img.id] || imageUrl(img.filePath);
          const fullUrl = imgSrc.startsWith('data:') ? imgSrc : window.location.origin + imgSrc;

          try {
            const response = await fetch(fullUrl);
            const blob = await response.blob();
            const fileName = img.fileName || `image_${i + 1}.jpg`;
            folder.file(fileName, blob);
          } catch (err) {
            console.error(`Failed to fetch image ${img.fileName}:`, err);
          }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facebook_images_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setCopying('success');
      }
    } catch (err) {
      console.error('Copy/Download failed:', err);
      setCopying('error');
    }
  };

  const handleSaveEdit = (dataUrl: string) => {
    if (editingImage) {
      setEditedImages(prev => ({ ...prev, [editingImage.id]: dataUrl }));
      setEditingImage(null);
    }
  };

  const handleSaveCard = (dataUrl: string) => {
    setGeneratedCards(prev => [...prev, dataUrl]);
    setShowCardGenerator(false);
  };

  const handleSaveCollage = (dataUrl: string) => {
    setGeneratedCollages(prev => [...prev, dataUrl]);
    setShowCollageGenerator(false);
  };

  const handleCopyText = async () => {
    if (!generatedText) return;
    setCopying('text');
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopying('text-success');
      setTimeout(() => setCopying(null), 2000);
    } catch (err) {
      setCopying('error');
      setTimeout(() => setCopying(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">选择产品图片</label>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openPicker}>
            <Plus className="mr-1 h-4 w-4" /> 选择图片
          </Button>
          {selectedImages.length > 0 && (
            <span className="text-sm text-gray-500 flex items-center">已选 {selectedImages.length} 张</span>
          )}
        </div>
        {selectedImages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {selectedImages.map(img => (
              <div key={img.id} className="relative group flex flex-col items-center">
                <div className="h-20 w-20 rounded-lg overflow-hidden border bg-gray-50 relative">
                  <img
                    src={editedImages[img.id] || imageUrl(img.thumbnailMediumPath || img.filePath)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => setEditingImage(img)}
                    className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="编辑图片"
                  ><Edit3 size={12} /></button>
                  <button
                    onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== img.id))}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  ><X size={12} /></button>
                </div>
                <CopyButton
                  onClick={async () => { await copySingleImage(img); }}
                  label="复制"
                  successLabel="已复制"
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">文案模板</label>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'product', label: '产品介绍' },
            { key: 'promo', label: '促销活动' },
            { key: 'new', label: '新品上市' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTemplateType(t.key as any); generateText(selectedImages); }}
              className={`px-3 py-1.5 rounded-lg text-sm ${templateType === t.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >{t.label}</button>
          ))}
          {selectedImages.length > 0 && (
            <button
              onClick={generateWithAI}
              disabled={generatingAI}
              className="px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-md disabled:opacity-50"
            >
              {generatingAI ? 'AI生成中...' : '✨ AI生成文案'}
            </button>
          )}
          {selectedImages.length > 0 && (
            <>
              <button
                onClick={() => setShowCardGenerator(true)}
                className="px-3 py-1.5 rounded-lg text-sm bg-purple-100 text-purple-700 hover:bg-purple-200"
              >生成产品卡片</button>
              <button
                onClick={() => setShowCollageGenerator(true)}
                className="px-3 py-1.5 rounded-lg text-sm bg-orange-100 text-orange-700 hover:bg-orange-200"
              >图片拼图</button>
              <button
                onClick={() => setShowBatchWatermark(true)}
                className="px-3 py-1.5 rounded-lg text-sm bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
              >批量添加水印</button>
              {selectedImages.length > 1 && (
                <button
                  onClick={generateBatchPosts}
                  disabled={batchGenerating}
                  className="px-3 py-1.5 rounded-lg text-sm bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                >{batchGenerating ? '生成中...' : '批量生成帖子'}</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Generated cards */}
      {generatedCards.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">生成的产品卡片</label>
          <div className="flex flex-wrap gap-2">
            {generatedCards.map((card, idx) => (
              <div key={idx} className="relative group">
                <img src={card} alt={`Card ${idx + 1}`} className="h-32 rounded-lg border" />
                <button
                  onClick={() => setGeneratedCards(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                ><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated collages */}
      {generatedCollages.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">生成的拼图</label>
          <div className="flex flex-wrap gap-2">
            {generatedCollages.map((collage, idx) => (
              <div key={idx} className="relative group">
                <img src={collage} alt={`Collage ${idx + 1}`} className="h-32 rounded-lg border" />
                <button
                  onClick={() => setGeneratedCollages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                ><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated text - Dual column */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">生成的文案</label>
            {textSource === 'ai' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                AI生成
              </span>
            )}
            {textSource === 'template' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                模板
              </span>
            )}
            {translating && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                翻译中...
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{generatedText.length} 字符</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* English */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">English</span>
              <CopyButton
                onClick={async () => { await navigator.clipboard.writeText(generatedText); }}
                label="复制"
                successLabel="已复制"
              />
            </div>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              rows={10}
              value={generatedText}
              onChange={(e) => { setGeneratedText(e.target.value); setTextSource('manual'); }}
              placeholder="选择图片后自动生成文案..."
            />
          </div>
          {/* Chinese Translation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">中文翻译</span>
              <CopyButton
                onClick={async () => { await navigator.clipboard.writeText(translatedText); }}
                label="复制"
                successLabel="已复制"
              />
            </div>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              rows={10}
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              placeholder="翻译将自动生成..."
              readOnly={translating}
            />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleCopyImage}
          disabled={!selectedImages.length || copying === 'image'}
          className={`flex-1 ${copying === 'success' ? 'bg-green-600 hover:bg-green-700' : copying === 'error' ? 'bg-red-600 hover:bg-red-700' : ''}`}
        >
          {copying === 'success' ? <Check className="mr-1 h-4 w-4" /> : selectedImages.length > 1 ? <Download className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copying === 'image' ? '处理中...' : copying === 'success' ? (selectedImages.length > 1 ? '已下载' : '已复制') : copying === 'error' ? '失败' : selectedImages.length > 1 ? `下载ZIP (${selectedImages.length}张)` : '复制图片'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleCopyText}
          disabled={!generatedText || copying === 'text'}
          className={`flex-1 ${copying === 'text-success' ? 'bg-green-100 text-green-700' : ''}`}
        >
          {copying === 'text-success' ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copying === 'text' ? '复制中...' : copying === 'text-success' ? '已复制' : '复制文案'}
        </Button>
      </div>

      {/* Draft and Template buttons */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={saveDraft} disabled={!generatedText}>
          <Save className="mr-1 h-3 w-3" /> 保存草稿
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowSaveTemplate(true)} disabled={!generatedText}>
          <FileText className="mr-1 h-3 w-3" /> 存为模板
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowDrafts(true)}>
          <Clock className="mr-1 h-3 w-3" /> 草稿箱 ({drafts.length})
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)}>
          <FileText className="mr-1 h-3 w-3" /> 模板库 ({templates.length})
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        复制后打开Facebook，粘贴图片和文案即可发布
      </p>

      {/* Drafts Modal */}
      <Modal isOpen={showDrafts} onClose={() => setShowDrafts(false)} title="草稿箱" size="lg">
        <div className="space-y-3 max-h-96 overflow-auto">
          {drafts.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无草稿</p>
          ) : (
            drafts.map(draft => (
              <div key={draft.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">{new Date(draft.createdAt).toLocaleString()}</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap line-clamp-3">{draft.text}</p>
                    <p className="mt-1 text-xs text-gray-400">{draft.images?.length || 0} 张图片</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => loadDraft(draft)}>加载</Button>
                    <button onClick={() => deleteDraft(draft.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Templates Modal */}
      <Modal isOpen={showTemplates} onClose={() => setShowTemplates(false)} title="模板库" size="lg">
        <div className="space-y-3 max-h-96 overflow-auto">
          {templates.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无模板</p>
          ) : (
            templates.map(template => (
              <div key={template.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{template.name}</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap line-clamp-3">{template.text}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => loadTemplate(template)}>使用</Button>
                    <button onClick={() => deleteTemplate(template.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Save Template Modal */}
      <Modal isOpen={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} title="保存为模板" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">模板名称</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="输入模板名称..."
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowSaveTemplate(false)}>取消</Button>
            <Button onClick={saveTemplate} disabled={!templateName.trim()}>保存</Button>
          </div>
        </div>
      </Modal>

      {/* Asset Picker Modal */}
      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="选择产品图片" size="2xl">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索OE号或文件名..."
                defaultValue={pickerKeyword}
                onBlur={(e) => setPickerKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPickerKeyword((e.target as HTMLInputElement).value); } }}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <select
              value={pickerClassId}
              onChange={(e) => setPickerClassId(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm"
            >
              <option value="">全部分类</option>
              {classifications.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="max-h-[50vh] overflow-auto">
            {pickerAssets.length === 0 && !pickerLoading ? (
              <p className="py-12 text-center text-gray-400">暂无图片</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {pickerAssets.filter(a => a.type === 'image').map(asset => {
                  const selected = pickerSelected.has(asset.id);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => togglePickerSelect(asset)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img src={imageUrl(asset.thumbnailMediumPath)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      {selected && (
                        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-0.5"><Check size={14} /></div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate">
                        {asset.recognizedOeNumber || asset.fileName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {pickerLoading && <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}
            {pickerAssets.length < pickerTotal && !pickerLoading && (
              <div className="flex justify-center py-4">
                <Button variant="secondary" onClick={() => { const next = pickerPage + 1; setPickerPage(next); fetchPickerAssets(next, true); }}>加载更多</Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-gray-500">已选 {pickerSelected.size} 张</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowPicker(false)}>取消</Button>
              <Button onClick={confirmPicker}>确认选择</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Image Editor Modal */}
      {editingImage && (
        <Modal isOpen={true} onClose={() => setEditingImage(null)} title="编辑图片" size="3xl">
          <ImageEditor
            imageUrl={editedImages[editingImage.id] || imageUrl(editingImage.filePath)}
            onSave={handleSaveEdit}
            onClose={() => setEditingImage(null)}
          />
        </Modal>
      )}

      {/* Product Card Generator Modal */}
      {showCardGenerator && (
        <Modal isOpen={true} onClose={() => setShowCardGenerator(false)} title="生成产品卡片" size="xl">
          <ProductCardGenerator
            parts={selectedImages.map(img => ({
              oeNumber: img.recognizedOeNumber || '',
              partNameEn: img.partNameEn || '',
              partNameCn: img.partNameCn || '',
              brand: img.recognizedBrand || '',
            }))}
            onSave={handleSaveCard}
            onClose={() => setShowCardGenerator(false)}
          />
        </Modal>
      )}

      {/* Image Collage Generator Modal */}
      {showCollageGenerator && (
        <Modal isOpen={true} onClose={() => setShowCollageGenerator(false)} title="图片拼图" size="xl">
          <ImageCollageGenerator
            images={selectedImages.map(img => ({
              url: imageUrl(img.filePath),
              name: img.fileName,
            }))}
            onSave={handleSaveCollage}
            onClose={() => setShowCollageGenerator(false)}
          />
        </Modal>
      )}

      {/* Batch Generator Modal */}
      <Modal isOpen={showBatchGenerator} onClose={() => setShowBatchGenerator(false)} title="批量生成帖子" size="xl">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">为每个选中的图片生成独立的帖子文案，点击复制按钮可一键复制图片和文案。</p>
          <div className="max-h-[60vh] overflow-auto space-y-3">
            {batchResults.map((result, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex gap-3">
                  <img src={imageUrl(result.image.thumbnailMediumPath)} alt="" className="h-20 w-20 rounded object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{result.image.fileName}</p>
                    <p className="text-xs text-gray-500">OE: {result.image.recognizedOeNumber || '-'}</p>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{result.text}</p>
                  </div>
                  <Button size="sm" onClick={() => copyBatchPost(result.text, result.image)}>
                    <Copy className="mr-1 h-3 w-3" /> 复制
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowBatchGenerator(false)}>关闭</Button>
          </div>
        </div>
      </Modal>

      {/* Batch Watermark Modal */}
      {showBatchWatermark && (
        <BatchWatermarkModal
          imageCount={selectedImages.length}
          previewUrl={selectedImages[0] ? imageUrl(selectedImages[0].filePath) : ''}
          onApply={handleBatchWatermark}
          onClose={() => { setShowBatchWatermark(false); setWatermarkProgress(null); }}
          processing={watermarkProcessing}
          progress={watermarkProgress}
          onConfigChange={(config) => {
            setWatermarkText(config.text);
            setWatermarkPosition(config.position as any);
            setWatermarkFontSize(config.fontSize);
            setWatermarkOpacity(config.opacity);
            if (config.rotation !== undefined) setWatermarkRotation(config.rotation);
          }}
        />
      )}
    </div>
  );
}

// Quick Reply Templates Component
// Add Template Modal Component
function AddTemplateModal({ onAdd, onClose }: { onAdd: (name: string, content: string) => void; onClose: () => void }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Modal isOpen={true} onClose={onClose} title="新增快捷回复" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">模板名称</label>
          <input ref={nameRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="如：价格询问" />
        </div>
        <div>
          <label className="text-sm font-medium">回复内容</label>
          <textarea ref={contentRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" rows={5} placeholder="输入回复模板..." />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={() => {
            const name = nameRef.current?.value || '';
            const content = contentRef.current?.value || '';
            if (name.trim() && content.trim()) onAdd(name, content);
          }}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}

function QuickReplyTemplates() {
  const { success, error } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fb_quick_replies');
      if (saved) {
        setTemplates(JSON.parse(saved));
      } else {
        const defaults = [
          { id: 1, name: '价格询问', content: 'Thank you for your interest! Please provide the OE number and quantity, and I will send you a quote shortly.' },
          { id: 2, name: '库存查询', content: 'Let me check the availability for you. Please provide the OE number(s) you need.' },
          { id: 3, name: '发货时间', content: 'Standard shipping takes 7-15 days by sea. Express shipping (3-5 days) is also available at additional cost.' },
          { id: 4, name: '付款方式', content: 'We accept T/T (bank transfer), Western Union, PayPal, and L/C. What payment method do you prefer?' },
          { id: 5, name: '感谢询价', content: 'Thank you for your inquiry! We will process your request and get back to you within 24 hours.' },
        ];
        setTemplates(defaults);
        localStorage.setItem('fb_quick_replies', JSON.stringify(defaults));
      }
    } catch {}
  }, []);

  const saveTemplates = (updated: any[]) => {
    setTemplates(updated);
    localStorage.setItem('fb_quick_replies', JSON.stringify(updated));
  };

  const deleteTemplate = (id: number) => {
    saveTemplates(templates.filter(t => t.id !== id));
  };

  const copyTemplate = async (template: any) => {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { success('复制失败'); }
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">快捷回复</h2>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-3 w-3" /> 新增模板
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        <div className="space-y-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {templates.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-gray-500 truncate">{t.content}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => copyTemplate(t)}
                  className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  {copiedId === t.id ? '✓ 已复制' : '复制'}
                </button>
                <button onClick={() => deleteTemplate(t.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAdd && (
          <AddTemplateModal
            onAdd={(name, content) => {
              const template = { id: Date.now(), name, content };
              saveTemplates([template, ...templates]);
              setShowAdd(false);
            }}
            onClose={() => setShowAdd(false)}
          />
        )}
      </Card.Body>
    </Card>
  );
}

// Add Inquiry Modal Component
function AddInquiryModal({ onAdd, onClose }: { onAdd: (data: any) => void; onClose: () => void }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const oeRef = useRef<HTMLInputElement>(null);
  const productNameRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Modal isOpen={true} onClose={onClose} title="新增询价" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">客户名称 *</label>
          <input ref={nameRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="客户名称或Facebook用户名" />
        </div>
        <div>
          <label className="text-sm font-medium">联系方式</label>
          <input ref={contactRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="电话/邮箱/WhatsApp" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">产品OE号</label>
            <input ref={oeRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="OE号" />
          </div>
          <div>
            <label className="text-sm font-medium">产品名称</label>
            <input ref={productNameRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="产品名称" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">数量</label>
          <input ref={quantityRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="需求数量" />
        </div>
        <div>
          <label className="text-sm font-medium">备注</label>
          <textarea ref={notesRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" rows={3} placeholder="其他备注信息" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={() => {
            const name = nameRef.current?.value || '';
            if (!name.trim()) return;
            onAdd({
              customer_name: name,
              customer_contact: contactRef.current?.value || '',
              product_oe: oeRef.current?.value || '',
              product_name: productNameRef.current?.value || '',
              quantity: quantityRef.current?.value || '',
              notes: notesRef.current?.value || '',
              status: 'new',
            });
          }}>保存</Button>
        </div>
      </div>
    </Modal>
  );
}

// Sync to Customer Modal Component
function SyncCustomerModal({ inquiry, onSync, onClose }: {
  inquiry: any;
  onSync: (data: any) => void;
  onClose: () => void;
}) {
  const [customerTypes, setCustomerTypes] = useState<string[]>(['经销商', '修理厂', '终端客户', '贸易商', '电商平台']);
  const [customerLevels, setCustomerLevels] = useState<string[]>(['普通', 'VIP', '重点', '潜在']);
  const [form, setForm] = useState({
    company_name: inquiry.customer_name || '',
    contact_person: inquiry.customer_name || '',
    phone: inquiry.customer_contact || '',
    email: '',
    address: '',
    country: '',
    customer_type: '经销商',
    customer_level: '普通',
    notes: `来自Facebook询价 - OE: ${inquiry.product_oe || '-'}, 产品: ${inquiry.product_name || '-'}`,
  });

  // Load customer types from API
  useEffect(() => {
    api.get('/customers/config/types').then(({ data }) => {
      if (data.types) setCustomerTypes(data.types);
      if (data.levels) setCustomerLevels(data.levels);
    }).catch(() => {});
  }, []);

  return (
    <Modal isOpen={true} onClose={onClose} title="同步到客户列表" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">补全客户信息后同步到客户管理模块</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">公司名称 *</label>
            <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">联系人</label>
            <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">电话</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">邮箱</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">国家</label>
            <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">客户类型</label>
            <select value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
              {customerTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">客户等级</label>
            <select value={form.customer_level} onChange={(e) => setForm({ ...form, customer_level: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
              {customerLevels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">地址</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">备注</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" rows={2} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={() => onSync(form)} disabled={!form.company_name.trim()}>同步到客户列表</Button>
        </div>
      </div>
    </Modal>
  );
}

// Inquiry Manager Component
function InquiryManager() {
  const { success, error } = useToast();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [syncInquiry, setSyncInquiry] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fb_inquiries');
      if (saved) setInquiries(JSON.parse(saved));
    } catch {}
  }, []);

  const saveInquiries = (updated: any[]) => {
    setInquiries(updated);
    localStorage.setItem('fb_inquiries', JSON.stringify(updated));
  };

  const updateStatus = (id: number, status: string) => {
    saveInquiries(inquiries.map(i => i.id === id ? { ...i, status } : i));
  };

  const deleteInquiry = (id: number) => {
    saveInquiries(inquiries.filter(i => i.id !== id));
  };

  const syncToCustomer = async (formData: any) => {
    try {
      await api.post('/customers', formData);
      // Mark inquiry as synced
      saveInquiries(inquiries.map(i =>
        i.id === syncInquiry.id ? { ...i, synced: true } : i
      ));
      setSyncInquiry(null);
      success('客户已同步到客户列表！');
    } catch (err: any) {
      error(err.response?.data?.message || '同步失败');
    }
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    quoted: 'bg-yellow-100 text-yellow-700',
    ordered: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    new: '新询价',
    quoted: '已报价',
    ordered: '已下单',
    lost: '已流失',
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Facebook 询价管理</h2>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-3 w-3" /> 新增询价
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {inquiries.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无询价记录</p>
          ) : (
            <div className="space-y-3">
              {inquiries.map(inq => (
                <div key={inq.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{inq.customer_name}</p>
                      {inq.customer_contact && <p className="text-sm text-gray-500">{inq.customer_contact}</p>}
                      <p className="text-sm mt-1">
                        {inq.product_name && <span>{inq.product_name} </span>}
                        {inq.product_oe && <span className="font-mono text-blue-600">OE: {inq.product_oe}</span>}
                      </p>
                      {inq.quantity && <p className="text-sm text-gray-500">数量: {inq.quantity}</p>}
                      {inq.notes && <p className="text-sm text-gray-500 mt-1">{inq.notes}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(inq.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {inq.synced ? (
                        <span className="text-xs text-green-600">✓ 已同步</span>
                      ) : (
                        <button
                          onClick={() => setSyncInquiry(inq)}
                          className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >同步到客户</button>
                      )}
                      <select
                        value={inq.status}
                        onChange={(e) => updateStatus(inq.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs ${statusColors[inq.status] || 'bg-gray-100'}`}
                      >
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <button onClick={() => deleteInquiry(inq.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAdd && (
          <AddInquiryModal
            onAdd={(data) => {
              const inquiry = { id: Date.now(), ...data, createdAt: new Date().toISOString() };
              saveInquiries([inquiry, ...inquiries]);
              setShowAdd(false);
            }}
            onClose={() => setShowAdd(false)}
          />
        )}

        {syncInquiry && (
          <SyncCustomerModal
            inquiry={syncInquiry}
            onSync={syncToCustomer}
            onClose={() => setSyncInquiry(null)}
          />
        )}
      </Card.Body>
    </Card>
  );
}

export default function Facebook() {
  const { success, error, warning } = useToast();
  const [showPostCreator, setShowPostCreator] = useState(false);

  // Asset picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerAssets, setPickerAssets] = useState<AssetItem[]>([]);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerKeyword, setPickerKeyword] = useState('');
  const [pickerClassId, setPickerClassId] = useState('');
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [pickerSelected, setPickerSelected] = useState<Set<number>>(new Set());
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch asset thumbnails for selected assets
  // Fetch assets for picker
  const fetchPickerAssets = useCallback(async (page: number, append = false) => {
    setPickerLoading(true);
    try {
      const params: any = { page, page_size: 20, type: 'image' };
      if (pickerKeyword) params.keyword = pickerKeyword;
      if (pickerClassId) params.classification_id = pickerClassId;
      const { data: res } = await api.get('/assets', { params });
      const result = res.data || res;
      const items = result.items || [];
      setPickerTotal(result.total || 0);
      setPickerAssets((prev) => (append ? [...prev, ...items] : items));
    } catch { /* ignore */ }
    finally { setPickerLoading(false); }
  }, [pickerKeyword, pickerClassId]);

  // Fetch classifications
  const fetchClassifications = async () => {
    try {
      const { data: res } = await api.get('/assets/meta/classifications');
      setClassifications(res.data || res || []);
    } catch { /* ignore */ }
  };

  const openPicker = () => {
    setPickerSelected(new Set());
    setPickerPage(1);
    setPickerKeyword('');
    setPickerClassId('');
    setShowPicker(true);
    fetchClassifications();
    fetchPickerAssets(1);
  };

  // Reload when filters change
  useEffect(() => {
    if (!showPicker) return;
    setPickerPage(1);
    fetchPickerAssets(1);
  }, [pickerKeyword, pickerClassId, showPicker, fetchPickerAssets]);

  const loadMore = () => {
    const next = pickerPage + 1;
    setPickerPage(next);
    fetchPickerAssets(next, true);
  };

  const togglePickerSelect = (id: number) => {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmPicker = () => {
    setShowPicker(false);
  };

  const classOptions = [
    { value: '', label: '全部分类' },
    ...classifications.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const imageUrl = (path: string) => `/uploads/${path}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Facebook 管理</h1>
      </div>

      {/* Post Creator Section */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold">生成Facebook帖子</h2>
          <p className="text-sm text-gray-500">从素材库选择图片，自动生成文案，复制后发布到Facebook</p>
        </Card.Header>
        <Card.Body>
          <PostCreator onClose={() => setShowPostCreator(false)} />
        </Card.Body>
      </Card>

      {/* Inquiry Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InquiryManager />
        <QuickReplyTemplates />
      </div>

      {/* Asset Picker Modal */}
      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="选择图片素材" size="2xl">
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索文件名..."
                  value={pickerKeyword}
                  onChange={(e) => setPickerKeyword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150"
                />
              </div>
            </div>
            <select
              value={pickerClassId}
              onChange={(e) => setPickerClassId(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-150"
            >
              {classOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Asset grid */}
          <div ref={pickerRef} className="max-h-[50vh] overflow-auto">
            {pickerAssets.length === 0 && !pickerLoading ? (
              <p className="py-12 text-center text-gray-400">暂无图片素材</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {pickerAssets.filter((a) => a.type === 'image').map((asset) => {
                  const selected = pickerSelected.has(asset.id);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => togglePickerSelect(asset.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      {asset.thumbnailMediumPath ? (
                        <img src={imageUrl(asset.thumbnailMediumPath)} alt={asset.fileName} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 text-xs">无图</div>
                      )}
                      {selected && (
                        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-0.5">
                          <Check size={14} />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate">
                        {asset.fileName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {pickerLoading && (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            )}

            {pickerAssets.length < pickerTotal && !pickerLoading && (
              <div className="flex justify-center py-4">
                <Button variant="secondary" type="button" onClick={loadMore} className="text-sm">
                  加载更多
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-gray-500">
              已选 {pickerSelected.size} 张
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={() => setShowPicker(false)}>取消</Button>
              <Button type="button" onClick={confirmPicker}>确认选择</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
