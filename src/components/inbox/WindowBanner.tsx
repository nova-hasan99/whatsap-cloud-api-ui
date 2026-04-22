import { Clock, AlertTriangle } from 'lucide-react';
import { cx, windowCountdown } from '@/lib/utils';

export function WindowBanner({ expiresAt }: { expiresAt: string | null }) {
  const w = windowCountdown(expiresAt);
  if (w.expired) {
    return (
      <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
        <AlertTriangle size={14} />
        24-hour window expired. Only template messages can be sent.
      </div>
    );
  }
  if (!w.warn) return null;
  return (
    <div
      className={cx(
        'flex items-center gap-2 border-b px-4 py-2 text-xs',
        w.critical
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-amber-200 bg-amber-50 text-amber-800',
      )}
    >
      <Clock size={14} />
      Window closing soon — {w.label}
    </div>
  );
}

export function WindowStatusPill({ expiresAt }: { expiresAt: string | null }) {
  const w = windowCountdown(expiresAt);
  if (w.expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
        <Clock size={12} />
        Window expired
      </span>
    );
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        w.warn ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
      )}
    >
      <Clock size={12} />
      Reply within {w.label}
    </span>
  );
}
