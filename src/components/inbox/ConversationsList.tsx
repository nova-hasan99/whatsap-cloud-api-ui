import { useState } from 'react';
import { Search, MessageSquare, SquarePen } from 'lucide-react';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';
import { Input } from '@/components/ui/Input';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConversationItem } from './ConversationItem';
import { NewContactModal } from './NewContactModal';
import { useConversations } from '@/hooks/useConversations';
import { useDebounce } from '@/hooks/useDebounce';
import { callFunction } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { FILTERS, type FilterKey } from '@/lib/constants';
import { cx } from '@/lib/utils';
import type { Conversation, WhatsAppNumber } from '@/lib/database.types';

interface Props {
  numbers: WhatsAppNumber[];
  selectedNumberId: string | null;
  onSelectNumber: (id: string) => void;
  selectedConversationId: string | null;
  onSelectConversation: (c: Conversation) => void;
  onDeleteConversation?: (c: Conversation) => void;
}

export function ConversationsList({
  numbers,
  selectedNumberId,
  onSelectNumber,
  selectedConversationId,
  onSelectConversation,
  onDeleteConversation,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [newContactOpen, setNewContactOpen] = useState(false);
  const debounced = useDebounce(search, 220);
  const toast = useToast();

  const { conversations, loading, removeById } = useConversations({
    whatsappNumberId: selectedNumberId,
    filter,
    search: debounced,
  });

  const numberOptions: DropdownOption<string>[] = numbers.map((n) => ({
    value: n.id,
    label: n.display_name,
    description: n.phone_number,
  }));

  async function handleDelete(conv: Conversation) {
    removeById(conv.id);
    onDeleteConversation?.(conv);
    try {
      await callFunction('delete-conversation', { conversation_id: conv.id });
      toast.success('Conversation deleted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete');
    }
  }

  return (
    <div className="flex h-full flex-col bg-wa-panel">
      <div className="border-b border-gray-300/40 bg-wa-panel px-3 pt-3 pb-2">
        <Dropdown
          value={selectedNumberId}
          options={numberOptions}
          onChange={onSelectNumber}
          placeholder="Select a number"
        />

        {/* Search + new conversation button */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search conversations"
              leftSlot={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setNewContactOpen(true)}
            disabled={!selectedNumberId}
            title="New conversation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition-colors hover:border-wa-teal hover:bg-emerald-50 hover:text-wa-teal disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SquarePen size={15} />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                filter === f
                  ? 'bg-wa-teal text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin bg-white">
        {!selectedNumberId ? (
          <EmptyState
            icon={<MessageSquare size={32} />}
            title="No number selected"
            message="Pick a WhatsApp number to load conversations."
          />
        ) : loading && conversations.length === 0 ? (
          <>
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={32} />}
            title="No conversations"
            message="Once a customer messages this number, they'll appear here."
          />
        ) : (
          conversations.map((c) => (
            <ConversationItem
              key={c.id}
              conv={c}
              active={selectedConversationId === c.id}
              onClick={() => onSelectConversation(c)}
              onDelete={() => handleDelete(c)}
            />
          ))
        )}
      </div>

      <NewContactModal
        open={newContactOpen}
        onClose={() => setNewContactOpen(false)}
        whatsappNumberId={selectedNumberId}
        onConversationReady={(conv) => {
          setNewContactOpen(false);
          onSelectConversation(conv);
        }}
      />
    </div>
  );
}
