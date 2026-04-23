import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Conversation } from '@/lib/database.types';
import type { FilterKey } from '@/lib/constants';

interface Args {
  whatsappNumberId: string | null;
  filter: FilterKey;
  search: string;
}

export function useConversations({ whatsappNumberId, filter, search }: Args) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!whatsappNumberId) {
      setConversations([]);
      return;
    }
    setLoading(true);
    let q = supabase
      .from('conversations')
      .select('*')
      .eq('whatsapp_number_id', whatsappNumberId)
      .order('last_message_at', { ascending: false });

    if (filter === 'archived') q = q.eq('status', 'archived');
    else q = q.eq('status', 'active');

    if (filter === 'unread') q = q.gt('unread_count', 0);
    if (filter === 'active') q = q.gt('window_expires_at', new Date().toISOString());

    const { data } = await q;
    setConversations(data ?? []);
    setLoading(false);
  }, [whatsappNumberId, filter]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime subscription
  useEffect(() => {
    if (!whatsappNumberId) return;
    const ch = supabase
      .channel(`conversations:${whatsappNumberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `whatsapp_number_id=eq.${whatsappNumberId}`,
        },
        () => {
          refetch();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [whatsappNumberId, refetch]);

  // Client-side search
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return conversations;
    return conversations.filter(
      (c) =>
        c.customer_phone.toLowerCase().includes(s) ||
        (c.customer_name || '').toLowerCase().includes(s),
    );
  }, [conversations, search]);

  const removeById = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { conversations: filtered, raw: conversations, loading, refetch, removeById };
}
