import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Stats {
  totalNumbers: number;
  conversationsToday: number;
  messagesSentToday: number;
  messagesReceivedToday: number;
  activeConversations: number;
  perNumber: Array<{
    id: string;
    display_name: string;
    phone_number: string;
    status: string;
    conversations: number;
    messagesToday: number;
  }>;
  recentActivity: Array<{
    time: string;
    numberLabel: string;
    eventType: string;
    details: string;
  }>;
}

const startOfDayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const todayIso = startOfDayIso();

    const [numbersRes, convRes, sentRes, recvRes, activeRes, recentMsgsRes] = await Promise.all([
      supabase.from('whatsapp_numbers').select('id, display_name, phone_number, status'),
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayIso),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'outbound')
        .gte('timestamp', todayIso),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .gte('timestamp', todayIso),
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gt('window_expires_at', new Date().toISOString()),
      supabase
        .from('messages')
        .select('id, direction, type, timestamp, whatsapp_number_id, content')
        .order('timestamp', { ascending: false })
        .limit(15),
    ]);

    const numbers = numbersRes.data ?? [];
    const numberMap = new Map(numbers.map((n) => [n.id, n]));

    // per-number aggregates
    const perNumber = await Promise.all(
      numbers.map(async (n) => {
        const [{ count: convCount }, { count: msgCount }] = await Promise.all([
          supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('whatsapp_number_id', n.id),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('whatsapp_number_id', n.id)
            .gte('timestamp', todayIso),
        ]);
        return {
          id: n.id,
          display_name: n.display_name,
          phone_number: n.phone_number,
          status: n.status,
          conversations: convCount ?? 0,
          messagesToday: msgCount ?? 0,
        };
      }),
    );

    const recentActivity = (recentMsgsRes.data ?? []).map((m: any) => ({
      time: m.timestamp,
      numberLabel:
        numberMap.get(m.whatsapp_number_id)?.display_name ?? 'Unknown',
      eventType:
        m.direction === 'inbound'
          ? `Received (${m.type})`
          : `Sent (${m.type})`,
      details:
        m.type === 'text'
          ? (m.content?.body ?? '').slice(0, 80)
          : m.type.toUpperCase(),
    }));

    setStats({
      totalNumbers: numbers.length,
      conversationsToday: convRes.count ?? 0,
      messagesSentToday: sentRes.count ?? 0,
      messagesReceivedToday: recvRes.count ?? 0,
      activeConversations: activeRes.count ?? 0,
      perNumber,
      recentActivity,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const t = window.setInterval(refetch, 30000);
    return () => window.clearInterval(t);
  }, [refetch]);

  return { stats, loading, refetch };
}
