// Send a template message (works even when 24h window is closed).
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';
import { sendTemplate } from '../_shared/meta.ts';

interface Payload {
  conversation_id: string;
  template_name: string;
  language: string;
  components?: unknown[];
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
  const required = ['conversation_id', 'template_name', 'language'];
  for (const k of required) {
    if (!(body as any)[k]) return errorResponse(`${k} is required`);
  }

  const sb = adminClient();

  const { data: conv, error: convErr } = await sb
    .from('conversations')
    .select('id, customer_phone, whatsapp_number_id, whatsapp_numbers!inner(phone_number_id, access_token)')
    .eq('id', body.conversation_id)
    .single();
  if (convErr || !conv) return errorResponse('Conversation not found', 404);
  const number = (conv as any).whatsapp_numbers;

  const content = {
    template_name: body.template_name,
    language: body.language,
    components: body.components ?? [],
  };

  const { data: pendingMsg, error: insErr } = await sb
    .from('messages')
    .insert({
      conversation_id: conv.id,
      whatsapp_number_id: conv.whatsapp_number_id,
      direction: 'outbound',
      type: 'template',
      content,
      status: 'pending',
      timestamp: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insErr) return errorResponse(insErr.message, 500);

  try {
    const result = await sendTemplate({
      phoneNumberId: number.phone_number_id,
      accessToken: number.access_token,
      to: conv.customer_phone,
      templateName: body.template_name,
      language: body.language,
      components: body.components,
    });
    const wamid = result.messages?.[0]?.id ?? null;
    await sb
      .from('messages')
      .update({ status: 'sent', wamid })
      .eq('id', pendingMsg!.id);
    return jsonResponse({ success: true, wamid });
  } catch (e: any) {
    await sb
      .from('messages')
      .update({ status: 'failed', content: { ...content, error: e.message } })
      .eq('id', pendingMsg!.id);
    return errorResponse(e.message ?? 'Template send failed', 502);
  }
});
