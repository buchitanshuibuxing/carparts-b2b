import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import api from '@/lib/api';

export interface PartOption {
  id: number;
  oeNumber: string;
  partNameCn: string;
  partNameEn?: string;
  brand?: string;
  category?: string;
  quantity?: number;
}

interface Props {
  onSelect: (part: PartOption | null) => void;
  value?: PartOption | null;
  placeholder?: string;
  disabled?: boolean;
}

export function PartPicker({ onSelect, value, placeholder = '搜索 OE 编号或名称...', disabled }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PartOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ignoreBlur = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/parts/search', { params: { q: q.trim(), limit: 10 } });
        const items = Array.isArray(data) ? data : (data.data || []);
        setResults(items);
        setOpen(items.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleSelect = (part: PartOption) => {
    ignoreBlur.current = true;
    onSelect(part);
    setQuery('');
    setResults([]);
    setOpen(false);
    setTimeout(() => { ignoreBlur.current = false; }, 200);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!ignoreBlur.current) {
        setOpen(false);
      }
    }, 150);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-sm">
          <span className="font-mono text-blue-600">{value.oeNumber}</span>
          <span className="text-gray-700">{value.partNameCn}</span>
          {value.brand && <span className="text-gray-500">({value.brand})</span>}
          {!disabled && (
            <button type="button" onClick={handleClear} className="ml-auto text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-gray-100 transition-all duration-150"
          />
          {loading && (
            <div className="absolute right-3 top-2.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto">
          {results.map((part) => (
            <div
              key={part.id}
              role="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(part); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-blue-50/80 cursor-pointer select-none transition-colors"
            >
              <span className="font-mono text-blue-600 w-28 shrink-0">{part.oeNumber}</span>
              <span className="flex-1 truncate">{part.partNameCn}</span>
              {part.partNameEn && <span className="text-gray-400 truncate w-32">{part.partNameEn}</span>}
              {part.brand && <span className="text-gray-500 shrink-0">{part.brand}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
