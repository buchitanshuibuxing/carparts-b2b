import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">共 {total} 条</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm text-gray-600">{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-gray-500 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
