// Mark a message as read on Meta and zero unread_count locally.
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';
import { markRead } from '../_shared/meta.ts';

interface Payload {
  conversation_id: string;
  wamid?: string; // optional: if omitted, we use the latest inbound wamid in the conversation.
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.conversation_id) return errorResponse('conversation_id required');

  const sb = adminClient();
  const { data: conv } = await sb
    .from('conversations')
    .select('id, whatsapp_numbers!inner(phone_number_id, access_token)')
    .eq('id', body.conversation_id)
    .single();
  if (!conv) return errorResponse('Conversation not found', 404);

  let wamid = body.wamid;
  if (!wamid) {
    const { data: latest } = await sb
      .from('messages')
      .select('wamid')
      .eq('conversation_id', conv.id)
      .eq('direction', 'inbound')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();
    wamid = latest?.wamid ?? undefined;
  }

  const number = (conv as any).whatsapp_numbers;

  // Best-effort: don't fail if Meta refuses (e.g. wamid too old).
  if (wamid) {
    try {
      await markRead({
        phoneNumberId: number.phone_number_id,
        accessToken: number.access_token,
        messageId: wamid,
      });
    } catch (e) {
      console.warn('mark-read meta call failed', e);
    }
  }

  await sb.from('conversations').update({ unread_count: 0 }).eq('id', conv.id);
  return jsonResponse({ success: true });
});
