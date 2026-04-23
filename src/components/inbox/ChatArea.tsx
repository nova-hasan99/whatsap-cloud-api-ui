import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { callFunction } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { dateSeparatorLabel, cx } from '@/lib/utils';
import { DateSeparator } from './DateSeparator';
import { MessageBubble } from './MessageBubble';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { Message } from '@/lib/database.types';

interface Props {
  conversationId: string;
  onReply?: (msg: Message) => void;
}

export function ChatArea({ conversationId, onReply }: Props) {
  const { messages, loading, hasMore, loadMore } = useMessages(conversationId);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);
  const lastCountRef = useRef(0);
  const toast = useToast();

  async function handleDelete(msg: Message) {
    try {
      await callFunction('delete-message', { message_id: msg.id });
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete message');
    }
  }

  // Auto-scroll to bottom on first load and on new messages (when already near bottom).
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const justGrew = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;

    const distanceFromBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight;
    if (justGrew && distanceFromBottom < 200) {
      sc.scrollTop = sc.scrollHeight;
    }
  }, [messages.length]);

  // Initial scroll to bottom on first render after load.
  useEffect(() => {
    if (!loading && scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [loading, conversationId]);

  function onScroll() {
    const sc = scrollerRef.current;
    if (!sc) return;
    const distanceFromBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight;
    setShowJump(distanceFromBottom > 300);
  }

  function jumpDown() {
    const sc = scrollerRef.current;
    if (sc) sc.scrollTop = sc.scrollHeight;
  }

  // Group messages by day for separators
  let currentDay = '';
  let prevSenderKey = '';

  return (
    <div className="relative flex-1 overflow-hidden chat-pattern">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto scroll-thin py-3"
      >
        {hasMore && (
          <div className="my-2 flex justify-center">
            <Button variant="ghost" size="sm" onClick={loadMore}>
              Load earlier messages
            </Button>
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        )}

        {messages.map((m) => {
          const day = dateSeparatorLabel(m.timestamp);
          const showSep = day !== currentDay;
          if (showSep) currentDay = day;

          const senderKey = `${m.direction}`;
          const sameAsPrev = senderKey === prevSenderKey && !showSep;
          prevSenderKey = senderKey;

          return (
            <div key={m.id}>
              {showSep && <DateSeparator label={day} />}
              <MessageBubble
                message={m}
                prevSameSender={sameAsPrev}
                allMessages={messages}
                onReply={onReply}
                onDelete={handleDelete}
              />
            </div>
          );
        })}

        {messages.length === 0 && !loading && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No messages yet — say hello.
          </div>
        )}
      </div>

      {showJump && (
        <button
          onClick={jumpDown}
          className={cx(
            'absolute bottom-4 right-6 z-10 rounded-full bg-white p-2 shadow-panel hover:bg-gray-50',
          )}
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={18} className="text-wa-teal" />
        </button>
      )}
    </div>
  );
}
