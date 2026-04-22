import { META_GRAPH_VERSION } from './supabase.ts';

const BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export interface MetaCreds {
  phoneNumberId: string;
  accessToken: string;
}

async function metaFetch<T = unknown>(
  path: string,
  init: RequestInit & { token: string },
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = data?.error?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
  }
  return data as T;
}

export interface SendTextArgs extends MetaCreds {
  to: string;
  body: string;
  context?: { message_id: string };
}

export function sendText(a: SendTextArgs) {
  return metaFetch<{ messages: Array<{ id: string }> }>(
    `/${a.phoneNumberId}/messages`,
    {
      method: 'POST',
      token: a.accessToken,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: a.to,
        type: 'text',
        text: { body: a.body, preview_url: true },
        ...(a.context ? { context: a.context } : {}),
      }),
    },
  );
}

export interface SendMediaArgs extends MetaCreds {
  to: string;
  type: 'image' | 'video' | 'audio' | 'document';
  link?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
}

export function sendMedia(a: SendMediaArgs) {
  const mediaPayload: Record<string, unknown> = {};
  // Use id if available, otherwise link — never both (Meta rejects dual params)
  if (a.mediaId) {
    mediaPayload.id = a.mediaId;
  } else if (a.link) {
    mediaPayload.link = a.link;
  }
  if (a.caption && (a.type === 'image' || a.type === 'video' || a.type === 'document')) {
    mediaPayload.caption = a.caption;
  }
  if (a.filename && a.type === 'document') mediaPayload.filename = a.filename;

  return metaFetch<{ messages: Array<{ id: string }> }>(
    `/${a.phoneNumberId}/messages`,
    {
      method: 'POST',
      token: a.accessToken,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: a.to,
        type: a.type,
        [a.type]: mediaPayload,
      }),
    },
  );
}

export interface SendTemplateArgs extends MetaCreds {
  to: string;
  templateName: string;
  language: string;
  components?: unknown[];
}

export function sendTemplate(a: SendTemplateArgs) {
  return metaFetch<{ messages: Array<{ id: string }> }>(
    `/${a.phoneNumberId}/messages`,
    {
      method: 'POST',
      token: a.accessToken,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: a.to,
        type: 'template',
        template: {
          name: a.templateName,
          language: { code: a.language },
          ...(a.components ? { components: a.components } : {}),
        },
      }),
    },
  );
}

export function markRead(a: MetaCreds & { messageId: string }) {
  return metaFetch<{ success: boolean }>(`/${a.phoneNumberId}/messages`, {
    method: 'POST',
    token: a.accessToken,
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: a.messageId,
    }),
  });
}

export interface MetaMediaUrl {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
}

export async function fetchMediaUrl(token: string, mediaId: string): Promise<MetaMediaUrl> {
  return metaFetch<MetaMediaUrl>(`/${mediaId}`, { method: 'GET', token });
}

export async function downloadMedia(token: string, url: string): Promise<{ blob: Blob; mime: string }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Failed to download media: ${res.status}`);
  const mime = res.headers.get('content-type') || 'application/octet-stream';
  return { blob: await res.blob(), mime };
}

export interface UploadMediaArgs extends MetaCreds {
  file: Blob;
  filename: string;
  mimeType: string;
}

export async function uploadMedia(a: UploadMediaArgs): Promise<{ id: string }> {
  const fd = new FormData();
  fd.append('messaging_product', 'whatsapp');
  fd.append('type', a.mimeType);
  fd.append('file', a.file, a.filename);

  const res = await fetch(`${BASE}/${a.phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.accessToken}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Media upload failed');
  return data;
}

export interface FetchTemplatesArgs {
  wabaId: string;
  accessToken: string;
}

export async function fetchTemplates(a: FetchTemplatesArgs) {
  return metaFetch<{
    data: Array<{
      id: string;
      name: string;
      language: string;
      status: string;
      category: string;
      components: unknown[];
    }>;
  }>(`/${a.wabaId}/message_templates?limit=200`, {
    method: 'GET',
    token: a.accessToken,
  });
}
