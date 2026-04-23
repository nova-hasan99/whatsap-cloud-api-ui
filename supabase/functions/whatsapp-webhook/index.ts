// =============================================================
// Webhook for WhatsApp Cloud API.
// GET  → verification handshake (hub.mode/hub.verify_token/hub.challenge)
// POST → incoming messages and status updates
//
// IMPORTANT: this function must respond with 200 within 20s.
// All non-trivial work happens after we've parsed the payload but
// inside that window — we keep it tight.
// =============================================================

import { adminClient } from '../_shared/supabase.ts';
import { corsHeaders, jsonResponse, preflight } from '../_shared/cors.ts';
import { fetchMediaUrl, downloadMedia } from '../_shared/meta.ts';

interface MetaChange {
  value: {
    messaging_product: string;
    metadata: { phone_number_id: string; display_phone_number: string };
    contacts?: Array<{ profile?: { name?: string }; wa_id: string }>;
    messages?: Array<MetaIncomingMessage>;
    statuses?: Array<MetaStatus>;
  };
  field: string;
}

interface MetaIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string; voice?: boolean };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  context?: { id: string; from: string };
}

interface MetaStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message: string }>;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const url = new URL(req.url);

  // ---------- GET: verification handshake ----------
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode !== 'subscribe' || !token) {
      return new Response('Bad Request', { status: 400, headers: corsHeaders });
    }

    const sb = adminClient();
    const { data, error } = await sb
      .from('whatsapp_numbers')
      .select('id')
      .eq('webhook_verify_token', token)
      .maybeSingle();

    if (error || !data) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
    return new Response(challenge ?? '', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // ---------- POST: messages + status updates ----------
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  // Always 200 fast — log and process inline (cheap), but never throw.
  try {
    const sb = adminClient();
    const entries = payload?.entry ?? [];

    for (const entry of entries) {
      for (const change of (entry.changes ?? []) as MetaChange[]) {
        const phoneNumberId = change.value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const { data: numberRow } = await sb
          .from('whatsapp_numbers')
          .select('id, access_token')
          .eq('phone_number_id', phoneNumberId)
          .maybeSingle();
        if (!numberRow) continue;

        // ---------- Incoming messages ----------
        for (const msg of change.value.messages ?? []) {
          await handleIncomingMessage(sb, numberRow.id, numberRow.access_token, change.value, msg);
        }

        // ---------- Status updates ----------
        for (const st of change.value.statuses ?? []) {
          const failedPatch = st.status === 'failed' && st.errors
            ? { content: { error: st.errors[0] } }
            : {};
          const { data: updated } = await sb
            .from('messages')
            .update({ status: st.status, ...failedPatch })
            .eq('wamid', st.id)
            .select('id');

          // No matching message = sent from an external tool (n8n, automation, etc.)
          // Create the conversation + placeholder for ANY status (sent/delivered/read/failed)
          // so the contact always appears in the dashboard regardless of which event arrives first.
          if (!updated || updated.length === 0) {
            await captureExternalOutbound(sb, numberRow.id, st);
          }
        }
      }
    }
  } catch (e) {
    console.error('webhook processing error', e);
  }

  return jsonResponse({ received: true });
});

async function downloadAndStoreMedia(
  sb: ReturnType<typeof adminClient>,
  accessToken: string,
  mediaId: string,
  whatsappNumberId: string,
): Promise<string | null> {
  try {
    const { url, mime_type } = await fetchMediaUrl(accessToken, mediaId);
    const { blob } = await downloadMedia(accessToken, url);
    const ext = mime_type.split('/')[1]?.split(';')[0] ?? 'bin';
    const path = `${whatsappNumberId}/${mediaId}.${ext}`;
    const { error } = await sb.storage.from('media').upload(path, blob, {
      contentType: mime_type,
      upsert: true,
    });
    if (error) return null;
    const { data } = sb.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

async function handleIncomingMessage(
  sb: ReturnType<typeof adminClient>,
  whatsappNumberId: string,
  accessToken: string,
  value: MetaChange['value'],
  msg: MetaIncomingMessage,
) {
  const customerPhone = msg.from.startsWith('+') ? msg.from : '+' + msg.from;
  const contact = value.contacts?.find((c) => c.wa_id === customerPhone);
  const customerName = contact?.profile?.name ?? null;
  const ts = new Date(Number(msg.timestamp) * 1000).toISOString();

  // Find or create the conversation.
  const { data: existingConv } = await sb
    .from('conversations')
    .select('id')
    .eq('whatsapp_number_id', whatsappNumberId)
    .eq('customer_phone', customerPhone)
    .maybeSingle();

  let conversationId = existingConv?.id;
  if (!conversationId) {
    const { data: created, error } = await sb
      .from('conversations')
      .insert({
        whatsapp_number_id: whatsappNumberId,
        customer_phone: customerPhone,
        customer_name: customerName,
        last_message_at: ts,
        window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();
    if (error || !created) {
      console.error('conversation create failed', error);
      return;
    }
    conversationId = created.id;
  } else {
    // Every inbound message resets the 24-hour messaging window.
    const patch: Record<string, unknown> = {
      window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    if (customerName) patch.customer_name = customerName;
    await sb.from('conversations').update(patch).eq('id', conversationId);
  }

  // Build message content based on type.
  const supported = ['text', 'image', 'video', 'audio', 'document'];
  const type = supported.includes(msg.type) ? msg.type : 'text';
  let content: Record<string, unknown> = {};
  switch (type) {
    case 'text':
      content = { body: msg.text?.body ?? '' };
      break;
    case 'image': {
      const mediaId = msg.image?.id;
      const publicUrl = mediaId ? await downloadAndStoreMedia(sb, accessToken, mediaId, whatsappNumberId) : null;
      content = {
        media_id: mediaId,
        mime_type: msg.image?.mime_type,
        caption: msg.image?.caption ?? '',
        ...(publicUrl ? { public_url: publicUrl } : {}),
      };
      break;
    }
    case 'video': {
      const mediaId = msg.video?.id;
      const publicUrl = mediaId ? await downloadAndStoreMedia(sb, accessToken, mediaId, whatsappNumberId) : null;
      content = {
        media_id: mediaId,
        mime_type: msg.video?.mime_type,
        caption: msg.video?.caption ?? '',
        ...(publicUrl ? { public_url: publicUrl } : {}),
      };
      break;
    }
    case 'audio': {
      const mediaId = msg.audio?.id;
      const publicUrl = mediaId ? await downloadAndStoreMedia(sb, accessToken, mediaId, whatsappNumberId) : null;
      content = {
        media_id: mediaId,
        mime_type: msg.audio?.mime_type,
        voice: !!msg.audio?.voice,
        ...(publicUrl ? { public_url: publicUrl } : {}),
      };
      break;
    }
    case 'document': {
      const mediaId = msg.document?.id;
      const publicUrl = mediaId ? await downloadAndStoreMedia(sb, accessToken, mediaId, whatsappNumberId) : null;
      content = {
        media_id: mediaId,
        mime_type: msg.document?.mime_type,
        filename: msg.document?.filename ?? 'file',
        caption: msg.document?.caption ?? '',
        ...(publicUrl ? { public_url: publicUrl } : {}),
      };
      break;
    }
  }
  if (msg.context?.id) (content as any).context_wamid = msg.context.id;

  // Insert message — trigger updates conversation last_* + window + unread.
  await sb.from('messages').upsert(
    {
      conversation_id: conversationId,
      whatsapp_number_id: whatsappNumberId,
      wamid: msg.id,
      direction: 'inbound',
      type,
      content,
      status: 'delivered',
      timestamp: ts,
    },
    { onConflict: 'wamid' },
  );
}

// Capture outbound messages sent from external tools (n8n, automations, etc.)
// Called when a status webhook arrives for a wamid we have no record of.
async function captureExternalOutbound(
  sb: ReturnType<typeof adminClient>,
  whatsappNumberId: string,
  st: MetaStatus,
) {
  const recipientPhone = st.recipient_id.startsWith('+') ? st.recipient_id : '+' + st.recipient_id;
  const ts = new Date(Number(st.timestamp) * 1000).toISOString();

  // Find or create conversation for this recipient
  const { data: existingConv } = await sb
    .from('conversations')
    .select('id')
    .eq('whatsapp_number_id', whatsappNumberId)
    .eq('customer_phone', recipientPhone)
    .maybeSingle();

  let conversationId = existingConv?.id;
  if (!conversationId) {
    const { data: created, error } = await sb
      .from('conversations')
      .insert({
        whatsapp_number_id: whatsappNumberId,
        customer_phone: recipientPhone,
        last_message_at: ts,
      })
      .select('id')
      .single();
    if (error || !created) return;
    conversationId = created.id;
  }

  // Log placeholder outbound message — content unknown (sent externally)
  await sb.from('messages').upsert(
    {
      conversation_id: conversationId,
      whatsapp_number_id: whatsappNumberId,
      wamid: st.id,
      direction: 'outbound',
      type: 'text',
      content: { body: '', external: true },
      status: st.status,
      timestamp: ts,
    },
    { onConflict: 'wamid' },
  );
}
