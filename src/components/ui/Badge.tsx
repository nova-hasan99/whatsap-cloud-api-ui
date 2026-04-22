import { cx } from '@/lib/utils';
import type { ReactNode } from 'react';

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const tones: Record<Tone, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-700',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    active: { tone: 'success', label: 'Active' },
    inactive: { tone: 'neutral', label: 'Inactive' },
    error: { tone: 'danger', label: 'Error' },
    approved: { tone: 'success', label: 'Approved' },
    pending: { tone: 'warning', label: 'Pending' },
    rejected: { tone: 'danger', label: 'Rejected' },
  };
  const v = map[status] ?? { tone: 'neutral' as Tone, label: status };
  return <Badge tone={v.tone}>{v.label}</Badge>;
}
