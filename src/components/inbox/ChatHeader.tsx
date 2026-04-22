import { ArrowLeft, Archive, MoreVertical } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { WindowStatusPill } from './WindowBanner';
import { formatPhone } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import type { Conversation } from '@/lib/database.types';

interface Props {
  conv: Conversation;
  onBack: () => void;
  onArchived: () => void;
}

export function ChatHeader({ conv, onBack, onArchived }: Props) {
  const toast = useToast();
  const display = conv.customer_name || formatPhone(conv.customer_phone);

  async function archive() {
    const { error } = await supabase
      .from('conversations')
      .update({ status: conv.status === 'archived' ? 'active' : 'archived' })
      .eq('id', conv.id);
    if (error) toast.error(error.message);
    else {
      toast.success(conv.status === 'archived' ? 'Unarchived' : 'Archived');
      onArchived();
    }
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-wa-panel px-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="rounded-full p-1 text-gray-600 hover:bg-gray-200 md:hidden"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <Avatar name={display} size={40} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">{display}</div>
          <div className="truncate text-[11px] text-gray-500">
            {formatPhone(conv.customer_phone)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <WindowStatusPill expiresAt={conv.window_expires_at} />
        <button
          onClick={archive}
          title={conv.status === 'archived' ? 'Unarchive' : 'Archive'}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-200"
        >
          <Archive size={16} />
        </button>
        <button className="rounded-full p-2 text-gray-600 hover:bg-gray-200" aria-label="More">
          <MoreVertical size={16} />
        </button>
      </div>
    </header>
  );
}
