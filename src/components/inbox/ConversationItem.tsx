import { useState } from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  onDelete?: () => Promise<void>;
  lastOutboundStatus?: 'sent' | 'delivered' | 'read' | 'pending' | 'failed';
}

export function ConversationItem({ conv, active, onClick, onDelete, lastOutboundStatus }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const display = conv.customer_name || formatPhone(conv.customer_phone);
  const w = windowCountdown(conv.window_expires_at);
  const unread = conv.unread_count > 0;

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <div className={cx('group relative border-b border-gray-200/60', active && 'bg-gray-200/70')}>
        {/* Main clickable row — pr-8 leaves room for the delete button */}
        <button
          onClick={onClick}
          className={cx(
            'flex w-full items-center gap-3 px-3 py-3 pr-8 text-left transition-colors',
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

        {/* Delete button — fades in on row hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmOpen(true);
            }}
            title="Delete conversation"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete conversation?"
        message={`Permanently remove all messages with ${display}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
