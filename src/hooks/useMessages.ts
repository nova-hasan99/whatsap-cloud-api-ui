import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/database.types';

const PAGE_SIZE = 50;

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const earliestRef = useRef<string | null>(null);

  const loadInitial = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .limit(PAGE_SIZE);
    const ordered = (data ?? []).slice().reverse();
    setMessages(ordered);
    earliestRef.current = ordered[0]?.timestamp ?? null;
    setHasMore((data ?? []).length === PAGE_SIZE);
    setLoading(false);
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !earliestRef.current) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('timestamp', earliestRef.current)
      .order('timestamp', { ascending: false })
      .limit(PAGE_SIZE);
    const ordered = (data ?? []).slice().reverse();
    setMessages((prev) => [...ordered, ...prev]);
    if (ordered.length) earliestRef.current = ordered[0]!.timestamp;
    setHasMore((data ?? []).length === PAGE_SIZE);
  }, [conversationId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Realtime: append on insert, mutate on update.
  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((x) => x.id !== id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId]);

  return { messages, loading, hasMore, loadMore, setMessages };
}
