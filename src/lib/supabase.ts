import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill them in.',
  );
}

export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export const FUNCTIONS_URL = `${url}/functions/v1`;

/** Invoke an edge function with the user's session JWT attached. */
export async function callFunction<T = any>(
  name: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token ?? anonKey;

  const isForm = body instanceof FormData;

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers as Record<string, string> | undefined),
    },
    body: isForm ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    ...init,
  });

  const text = await res.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    const raw = parsed?.error ?? parsed?.message;
    const msg = typeof raw === 'string' ? raw
      : raw != null ? JSON.stringify(raw)
      : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}
