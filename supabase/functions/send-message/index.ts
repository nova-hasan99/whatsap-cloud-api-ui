// Send a text or media message on behalf of an authenticated admin.
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';
import { sendMedia, sendText } from '../_shared/meta.ts';

interface Payload {
  conversation_id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  text?: string;
  media_url?: string;
  media_id?: string;
  caption?: string;
  filename?: string;
  reply_to_wamid?: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON');
  }
  if (!body.conversation_id || !body.type) {
    return errorResponse('conversation_id and type are required');
  }

  const sb = adminClient();

  // Look up conversation + number creds
  const { data: conv, error: convErr } = await sb
    .from('conversations')
    .select('id, customer_phone, window_expires_at, whatsapp_number_id, whatsapp_numbers!inner(phone_number_id, access_token)')
    .eq('id', body.conversation_id)
    .single();
  if (convErr || !conv) return errorResponse('Conversation not found', 404);

  const number = (conv as any).whatsapp_numbers;
  const creds = {
    phoneNumberId: number.phone_number_id,
    accessToken: number.access_token,
  };

  // Window check (only enforce for non-template — template has its own function)
  const windowOpen =
    conv.window_expires_at && new Date(conv.window_expires_at).getTime() > Date.now();
  if (!windowOpen) {
    return errorResponse(
      '24-hour window expired. Send a template message instead.',
      403,
    );
  }

  // Persist optimistically with status=pending so the UI can show ✓ immediately.
  const localContent: Record<string, unknown> =
    body.type === 'text'
      ? { body: body.text ?? '' }
      : {
          link: body.media_url,
          media_id: body.media_id,
          caption: body.caption ?? '',
          filename: body.filename,
        };
  if (body.reply_to_wamid) localContent.context_wamid = body.reply_to_wamid;

  const { data: pendingMsg, error: insErr } = await sb
    .from('messages')
    .insert({
      conversation_id: conv.id,
      whatsapp_number_id: conv.whatsapp_number_id,
      direction: 'outbound',
      type: body.type,
      content: localContent,
      status: 'pending',
      timestamp: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insErr) return errorResponse(insErr.message, 500);

  // Call Meta
  try {
    let result: { messages: Array<{ id: string }> };
    if (body.type === 'text') {
      if (!body.text) throw new Error('text required');
      result = await sendText({
        ...creds,
        to: conv.customer_phone,
        body: body.text,
        ...(body.reply_to_wamid ? { context: { message_id: body.reply_to_wamid } } : {}),
      });
    } else {
      result = await sendMedia({
        ...creds,
        to: conv.customer_phone,
        type: body.type,
        link: body.media_url,
        mediaId: body.media_id,
        caption: body.caption,
        filename: body.filename,
      });
    }
    const wamid = result.messages?.[0]?.id ?? null;
    await sb
      .from('messages')
      .update({ status: 'sent', wamid })
      .eq('id', pendingMsg!.id);

    return jsonResponse({ success: true, message_id: pendingMsg!.id, wamid });
  } catch (e: any) {
    await sb
      .from('messages')
      .update({ status: 'failed', content: { ...localContent, error: e.message } })
      .eq('id', pendingMsg!.id);
    return errorResponse(e.message ?? 'Send failed', 502);
  }
});
