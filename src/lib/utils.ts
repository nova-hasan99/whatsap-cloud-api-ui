// Tiny utilities used across the app.

/** classnames helper (no dep) */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Generate a webhook verify token (browser-safe). */
export function generateVerifyToken(len = 32): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Format an ISO timestamp as a relative label. */
export function relativeTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24 && date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (now.getTime() - date.getTime() < 7 * 86400 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString();
}

/** Format chat timestamp HH:MM */
export function chatTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Format date separator label: TODAY / YESTERDAY / Mon, Jan 2 */
export function dateSeparatorLabel(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'TODAY';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'YESTERDAY';
  return d
    .toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
}

/** Get a human-readable countdown until window expiry. */
export function windowCountdown(expiresAt: string | null): {
  expired: boolean;
  label: string;
  warn: boolean;
  critical: boolean;
} {
  if (!expiresAt) return { expired: true, label: 'No window', warn: false, critical: false };
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return { expired: true, label: 'Window expired', warn: false, critical: false };
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;

  let label: string;
  if (hours >= 2) label = `${hours}h left`;
  else if (hours >= 1) label = `${hours}h ${remMin}m left`;
  else label = `${minutes}m left`;

  return {
    expired: false,
    label,
    warn: ms < 2 * 60 * 60 * 1000,
    critical: ms < 30 * 60 * 1000,
  };
}

/** Initial letter for avatar fallback. */
export function initial(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed[0]!.toUpperCase();
}

/** A deterministic color for avatar background based on a string. */
export function stringColor(input: string): string {
  const palette = ['#128C7E', '#075E54', '#34B7F1', '#25D366', '#7E57C2', '#EF5350', '#FFB300', '#26A69A'];
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}

/** Truncate a string to N chars with ellipsis. */
export function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** Normalise phone number for display (very lightweight). */
export function formatPhone(p: string): string {
  if (!p) return p;
  const cleaned = p.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  return `+${cleaned}`;
}

/** Detect URLs in a text and return parts for safe rendering. */
export function linkify(text: string): Array<{ kind: 'text' | 'link'; value: string }> {
  const re = /(https?:\/\/[^\s]+)/g;
  const out: Array<{ kind: 'text' | 'link'; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    out.push({ kind: 'link', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

/** Format file size as KB / MB. */
export function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Group an array by a key fn. */
export function groupBy<T, K extends string>(
  arr: T[],
  fn: (item: T) => K,
): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = fn(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}
