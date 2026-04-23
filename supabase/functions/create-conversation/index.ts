// Create or retrieve a conversation for an outbound-initiated contact.
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { whatsapp_number_id: string; customer_phone: string; customer_name?: string };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON'); }

  if (!body.whatsapp_number_id) return errorResponse('whatsapp_number_id required');
  if (!body.customer_phone) return errorResponse('customer_phone required');

  // Normalise to E.164: strip spaces/dashes/parens, ensure leading +
  let phone = body.customer_phone.replace(/[\s\-()]/g, '');
  if (!phone.startsWith('+')) phone = '+' + phone;

  const sb = adminClient();

  // Return existing conversation rather than creating a duplicate
  const { data: existing } = await sb
    .from('conversations')
    .select('*')
    .eq('whatsapp_number_id', body.whatsapp_number_id)
    .eq('customer_phone', phone)
    .maybeSingle();

  if (existing) return jsonResponse({ conversation: existing, created: false });

  const { data: conv, error } = await sb
    .from('conversations')
    .insert({
      whatsapp_number_id: body.whatsapp_number_id,
      customer_phone: phone,
      customer_name: body.customer_name ?? null,
      last_message_at: new Date().toISOString(),
      status: 'active',
    })
    .select('*')
    .single();

  if (error) return errorResponse(error.message, 500);
  return jsonResponse({ conversation: conv, created: true });
});
