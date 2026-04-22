import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '@/lib/utils';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
}

interface Props<T extends string> {
  value: T | null;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  className,
  disabled,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cx(
          'flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm transition-colors',
          'hover:border-gray-400 focus:border-wa-primary focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <span className={cx('truncate', !current && 'text-gray-400')}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className={cx('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-panel animate-fade-in">
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No options</div>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cx(
                'flex w-full flex-col items-start gap-0 px-3 py-2 text-left text-sm hover:bg-gray-100',
                o.value === value && 'bg-emerald-50 text-wa-teal',
              )}
            >
              <span>{o.label}</span>
              {o.description && (
                <span className="text-xs text-gray-500">{o.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
