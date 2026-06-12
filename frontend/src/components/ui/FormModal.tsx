import { useState, useRef, useEffect, FormEvent } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  grid?: boolean;
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  fields: FormField[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}

export function FormModal({
  isOpen,
  onClose,
  title,
  size = 'sm',
  fields,
  initialValues = {},
  onSubmit,
  submitLabel = '提交',
  loading = false,
}: FormModalProps) {
  const [form, setForm] = useState<Record<string, any>>(initialValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialValues);
    }
  }, [isOpen, initialValues]);

  const handleChange = (name: string, value: any) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(field => (
          <div key={field.name} className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={form[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white placeholder:text-gray-400 transition-colors duration-100"
                rows={3}
              />
            ) : field.type === 'select' ? (
              <select
                value={form[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-colors duration-100"
              >
                <option value="">{field.placeholder || '请选择'}</option>
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type || 'text'}
                value={form[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 rounded-lg text-sm bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white placeholder:text-gray-400 transition-colors duration-100"
              />
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving || loading}>
            {saving ? '提交中...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
