import { Check, CheckCheck, AlertTriangle, Clock } from 'lucide-react';
import { cx } from '@/lib/utils';
import type { MessageStatus as MS } from '@/lib/database.types';

export function MessageStatusIcon({
  status,
  size = 14,
  className,
}: {
  status: MS;
  size?: number;
  className?: string;
}) {
  switch (status) {
    case 'pending':
      return <Clock size={size} className={cx('text-gray-500', className)} />;
    case 'sent':
      return <Check size={size} className={cx('text-gray-500', className)} />;
    case 'delivered':
      return <CheckCheck size={size} className={cx('text-gray-500', className)} />;
    case 'read':
      return <CheckCheck size={size} className={cx('text-wa-read', className)} />;
    case 'failed':
      return <AlertTriangle size={size} className={cx('text-red-500', className)} />;
    default:
      return null;
  }
}
