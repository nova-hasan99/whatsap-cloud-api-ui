import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { WhatsAppNumber } from '@/lib/database.types';

export function useNumbers() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    setNumbers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { numbers, loading, error, refetch, setNumbers };
}
