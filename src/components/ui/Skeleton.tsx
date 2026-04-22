import { cx } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded bg-gray-200', className)} />;
}

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
