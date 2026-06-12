interface Column<T> {
  key: string;
  title: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyField: string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onSelect?: (id: number) => void;
  onSelectAll?: () => void;
}

export function Table<T extends Record<string, any>>({ columns, data, keyField, onRowClick, selectable, selectedIds, onSelect, onSelectAll }: Props<T>) {
  const allSelected = data.length > 0 && selectedIds && data.every(item => selectedIds.has(item[keyField]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {selectable && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="rounded"
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider" style={{ width: col.width }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const id = item[keyField];
            const isSelected = selectedIds?.has(id);
            return (
              <tr
                key={id}
                className={`border-b border-gray-50 hover:bg-blue-50/40 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-blue-50/60' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => onSelect?.(id)}
                      className="rounded"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
