import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'emerald',
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet';
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <div className={cx('rounded-lg p-2', tones[tone])}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
