import { Clock } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { MessageStatusIcon } from './MessageStatus';
import {
  cx,
  formatPhone,
  relativeTime,
  truncate,
  windowCountdown,
} from '@/lib/utils';
import type { Conversation } from '@/lib/database.types';

interface Props {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
  lastOutboundStatus?: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
}

export function ConversationItem({ conv, active, onClick, lastOutboundStatus }: Props) {
  const display = conv.customer_name || formatPhone(conv.customer_phone);
  const w = windowCountdown(conv.window_expires_at);
  const unread = conv.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
        'border-b border-gray-200/60',
        active ? 'bg-gray-200/70' : 'hover:bg-gray-100',
      )}
    >
      <Avatar name={display} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cx(
              'truncate text-[15px]',
              unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-800',
            )}
          >
            {display}
          </span>
          <span className={cx('shrink-0 text-[11px]', unread ? 'text-emerald-600 font-medium' : 'text-gray-500')}>
            {relativeTime(conv.last_message_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {lastOutboundStatus && <MessageStatusIcon status={lastOutboundStatus} size={14} />}
          <span className="flex-1 truncate text-[13px] text-gray-500">
            {truncate(conv.last_message_preview || '', 60) || <em className="text-gray-400">No messages yet</em>}
          </span>
          {unread && (
            <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-wa-primary px-1.5 text-[11px] font-medium text-white">
              {conv.unread_count}
            </span>
          )}
          {!w.expired && w.warn && (
            <span
              className={cx(
                'ml-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]',
                w.critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
              )}
            >
              <Clock size={10} />
              {w.label}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
