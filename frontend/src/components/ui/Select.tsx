import { SelectHTMLAttributes, ReactNode } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
  children?: ReactNode;
}

export function Select({ label, options, children, className = '', ...props }: Props) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={`w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all duration-150 ${className}`}
        {...props}
      >
        {options ? options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        )) : children}
      </select>
    </div>
  );
}
