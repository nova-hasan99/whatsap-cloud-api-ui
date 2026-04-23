import { X, Phone, Clock, MessageSquare, Archive, ArchiveRestore } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cx, formatPhone, relativeTime, chatTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Conversation } from '@/lib/database.types';

interface Props {
  conv: Conversation;
  open: boolean;
  onClose: () => void;
  onArchived: () => void;
}

export function ContactPanel({ conv, open, onClose, onArchived }: Props) {
  const toast = useToast();
  const display = conv.customer_name || formatPhone(conv.customer_phone);

  const windowExpires = conv.window_expires_at ? new Date(conv.window_expires_at) : null;
  const windowOpen = windowExpires && windowExpires.getTime() > Date.now();

  async function toggleArchive() {
    const next = conv.status === 'archived' ? 'active' : 'archived';
    const { error } = await supabase
      .from('conversations')
      .update({ status: next })
      .eq('id', conv.id);
    if (error) toast.error(error.message);
    else {
      toast.success(next === 'archived' ? 'Archived' : 'Unarchived');
      onArchived();
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 z-10 bg-black/10"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cx(
          'absolute inset-y-0 right-0 z-20 flex w-[320px] flex-col bg-white shadow-2xl border-l border-gray-200',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-wa-panel px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-800">Contact info</span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Avatar + name hero */}
          <div className="flex flex-col items-center gap-3 bg-wa-panel px-6 py-8">
            <Avatar
              name={display}
              src={conv.customer_profile_pic_url}
              size={88}
              className="ring-4 ring-white shadow-md"
            />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{display}</p>
              <p className="text-sm text-gray-500">{formatPhone(conv.customer_phone)}</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Phone */}
            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Contact
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                  <Phone size={16} className="text-wa-teal" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {formatPhone(conv.customer_phone)}
                  </p>
                  <p className="text-xs text-gray-400">WhatsApp</p>
                </div>
              </div>
            </div>

            {/* Messaging window */}
            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Messaging window
              </p>
              <div className="flex items-center gap-3">
                <div
                  className={cx(
                    'flex h-9 w-9 items-center justify-center rounded-full',
                    windowOpen ? 'bg-emerald-50' : 'bg-red-50',
                  )}
                >
                  <Clock size={16} className={windowOpen ? 'text-wa-teal' : 'text-red-400'} />
                </div>
                <div>
                  {windowOpen ? (
                    <>
                      <p className="text-sm font-medium text-emerald-700">Open</p>
                      <p className="text-xs text-gray-400">
                        Closes {relativeTime(conv.window_expires_at!)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-red-600">Expired</p>
                      <p className="text-xs text-gray-400">Templates only</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Conversation stats */}
            <div className="px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Conversation
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                  <MessageSquare size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Started {relativeTime(conv.created_at)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Last active {relativeTime(conv.last_message_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4">
              <button
                onClick={toggleArchive}
                className={cx(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  conv.status === 'archived'
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                {conv.status === 'archived' ? (
                  <ArchiveRestore size={16} />
                ) : (
                  <Archive size={16} />
                )}
                {conv.status === 'archived' ? 'Unarchive conversation' : 'Archive conversation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
