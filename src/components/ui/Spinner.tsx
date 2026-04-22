import { Loader2 } from 'lucide-react';
import { cx } from '@/lib/utils';

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cx('animate-spin text-wa-teal', className)} />;
}

export function SpinnerCenter({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 py-12">
      <Spinner />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
