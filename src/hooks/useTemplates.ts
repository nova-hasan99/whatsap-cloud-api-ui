import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MessageTemplate } from '@/lib/database.types';

export function useTemplates(numberId: string | null) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('message_templates')
      .select('*')
      .order('template_name', { ascending: true });
    if (numberId) q = q.eq('whatsapp_number_id', numberId);
    const { data } = await q;
    setTemplates(data ?? []);
    setLoading(false);
  }, [numberId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { templates, loading, refetch };
}
