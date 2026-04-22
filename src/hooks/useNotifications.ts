import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/** Plays a beep + fires a browser notification on new inbound messages. */
export function useInboundNotifications(enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-create a tiny beep using the Web Audio API; falls back silently if unavailable.
    audioRef.current = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }

    const ch = supabase
      .channel('inbox:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'direction=eq.inbound',
        },
        (payload) => {
          const m: any = payload.new;
          const body =
            m.type === 'text'
              ? (m.content?.body ?? '').slice(0, 120)
              : `New ${m.type} message`;
          try {
            audioRef.current?.play().catch(() => undefined);
          } catch {
            /* noop */
          }
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New WhatsApp message', { body });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [enabled]);
}
