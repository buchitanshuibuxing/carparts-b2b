export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-emerald-100 text-emerald-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-violet-100 text-violet-700',
  };
  return <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${colors[color] || colors.gray}`}>{children}</span>;
}
