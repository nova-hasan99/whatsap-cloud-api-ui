import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Settings, LogOut, Bell, BellOff } from 'lucide-react';
import { ConversationsList } from '@/components/inbox/ConversationsList';
import { ChatArea } from '@/components/inbox/ChatArea';
import { ChatHeader } from '@/components/inbox/ChatHeader';
import { ChatFooter } from '@/components/inbox/ChatFooter';
import { EmptyChatState } from '@/components/inbox/EmptyChatState';
import { WindowBanner } from '@/components/inbox/WindowBanner';
import { TemplateSelector } from '@/components/inbox/TemplateSelector';
import { useNumbers } from '@/hooks/useNumbers';
import { useInboundNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, callFunction } from '@/lib/supabase';
import { cx } from '@/lib/utils';
import type { Conversation, Message } from '@/lib/database.types';

export function InboxPage() {
  const { numbers } = useNumbers();
  const navigate = useNavigate();
  const { numberId, conversationId } = useParams();
  const { signOut } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  useInboundNotifications(notifEnabled);

  // Default to first number if none selected
  const activeNumberId = useMemo(() => {
    if (numberId) return numberId;
    return numbers[0]?.id ?? null;
  }, [numberId, numbers]);

  // Hydrate selected conversation from URL
  useEffect(() => {
    if (!conversationId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSelected(data ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Mark as read when a conversation opens.
  useEffect(() => {
    if (!selected || selected.unread_count === 0) return;
    callFunction('mark-read', { conversation_id: selected.id }).catch(() => undefined);
  }, [selected?.id]);

  function selectNumber(id: string) {
    navigate(`/inbox/${id}`);
  }
  function selectConversation(c: Conversation) {
    navigate(`/inbox/${c.whatsapp_number_id}/${c.id}`);
    setSelected(c);
    setReplyTo(null);
  }

  const showLeftOnMobile = !selected;

  return (
    <div className="flex h-screen bg-[#f0f2f5]">
      {/* Top compact toolbar (only on mobile + when no conv selected, also on desktop) */}
      <aside className="hidden w-12 flex-col items-center gap-2 border-r border-gray-200 bg-white py-3 md:flex">
        <button
          onClick={() => navigate('/dashboard')}
          title="Admin dashboard"
          className="rounded p-2 text-gray-600 hover:bg-gray-100"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={() => setNotifEnabled((n) => !n)}
          title={notifEnabled ? 'Mute notifications' : 'Enable notifications'}
          className="rounded p-2 text-gray-600 hover:bg-gray-100"
        >
          {notifEnabled ? <Bell size={18} /> : <BellOff size={18} />}
        </button>
        <div className="flex-1" />
        <button
          onClick={signOut}
          title="Logout"
          className="rounded p-2 text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
        </button>
      </aside>

      <div
        className={cx(
          'w-full md:w-[360px] lg:w-[400px] border-r border-gray-200',
          showLeftOnMobile ? 'block' : 'hidden md:block',
        )}
      >
        <ConversationsList
          numbers={numbers}
          selectedNumberId={activeNumberId}
          onSelectNumber={selectNumber}
          selectedConversationId={selected?.id ?? null}
          onSelectConversation={selectConversation}
        />
      </div>

      <div
        className={cx(
          'flex-1 flex-col',
          selected ? 'flex' : 'hidden md:flex',
        )}
      >
        {selected ? (
          <>
            <ChatHeader
              conv={selected}
              onBack={() => navigate(`/inbox/${selected.whatsapp_number_id}`)}
              onArchived={() => navigate(`/inbox/${selected.whatsapp_number_id}`)}
            />
            <WindowBanner expiresAt={selected.window_expires_at} />
            <ChatArea conversationId={selected.id} onReply={setReplyTo} />
            <ChatFooter
              conversationId={selected.id}
              whatsappNumberId={selected.whatsapp_number_id}
              windowExpiresAt={selected.window_expires_at}
              onOpenTemplate={() => setTemplateOpen(true)}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
            <TemplateSelector
              open={templateOpen}
              onClose={() => setTemplateOpen(false)}
              conversationId={selected.id}
              whatsappNumberId={selected.whatsapp_number_id}
            />
          </>
        ) : (
          <EmptyChatState />
        )}
      </div>
    </div>
  );
}
