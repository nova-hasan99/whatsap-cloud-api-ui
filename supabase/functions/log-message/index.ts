// Log an outbound message sent by an external tool (n8n, automation, etc.)
// Call this AFTER you send via Meta API, passing the wamid + content.
//
// POST body:
// {
//   "phone_number_id": "1054469031090734",   // Meta phone number ID
//   "recipient_phone": "8801774739914",       // without +
//   "wamid": "wamid.xxx",                     // from Meta send response
//   "type": "text" | "image" | "template" | "document" | "audio" | "video",
//   "content": { "body": "Hello!" },          // same shape as messages.content
//   "timestamp": 1745295600                   // unix seconds (optional, defaults now)
// }

import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: any;
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON'); }

  const { phone_number_id, recipient_phone, wamid, type, content, timestamp } = body;
  if (!phone_number_id || !recipient_phone || !wamid || !type || !content) {
    return errorResponse('phone_number_id, recipient_phone, wamid, type, content required');
  }

  const sb = adminClient();

  // Resolve whatsapp_number_id from phone_number_id
  const { data: number } = await sb
    .from('whatsapp_numbers')
    .select('id')
    .eq('phone_number_id', phone_number_id)
    .maybeSingle();
  if (!number) return errorResponse('Phone number not found', 404);

  const ts = timestamp
    ? new Date(Number(timestamp) * 1000).toISOString()
    : new Date().toISOString();

  // Find or create conversation
  const { data: existingConv } = await sb
    .from('conversations')
    .select('id')
    .eq('whatsapp_number_id', number.id)
    .eq('customer_phone', String(recipient_phone))
    .maybeSingle();

  let conversationId = existingConv?.id;
  if (!conversationId) {
    const { data: created, error } = await sb
      .from('conversations')
      .insert({
        whatsapp_number_id: number.id,
        customer_phone: String(recipient_phone),
        last_message_at: ts,
      })
      .select('id')
      .single();
    if (error || !created) return errorResponse(error?.message ?? 'Failed to create conversation', 500);
    conversationId = created.id;
  }

  // Upsert the message (idempotent by wamid)
  const { error: msgErr } = await sb.from('messages').upsert(
    {
      conversation_id: conversationId,
      whatsapp_number_id: number.id,
      wamid: String(wamid),
      direction: 'outbound',
      type,
      content,
      status: 'sent',
      timestamp: ts,
    },
    { onConflict: 'wamid' },
  );

  if (msgErr) return errorResponse(msgErr.message, 500);
  return jsonResponse({ success: true, conversation_id: conversationId });
});
