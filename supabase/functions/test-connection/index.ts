// Test that creds for a number are valid by hitting Meta's GET /{phone_number_id} endpoint.
import { adminClient, META_GRAPH_VERSION } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const { whatsapp_number_id } = await req.json().catch(() => ({}));
  if (!whatsapp_number_id) return errorResponse('whatsapp_number_id required');

  const sb = adminClient();
  const { data: number, error: dbErr } = await sb
    .from('whatsapp_numbers')
    .select('id, phone_number_id, access_token')
    .eq('id', whatsapp_number_id)
    .single();
  if (dbErr || !number) {
    return errorResponse(`Number not found — db: ${dbErr?.message ?? 'null row'}`, 404);
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${number.phone_number_id}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${number.access_token}` } },
    );
    const data = await res.json();
    if (!res.ok) {
      await sb.from('whatsapp_numbers').update({ status: 'error' }).eq('id', number.id);
      return errorResponse(data?.error?.message ?? 'Test failed', 502, data);
    }
    await sb.from('whatsapp_numbers').update({ status: 'active' }).eq('id', number.id);
    return jsonResponse({ success: true, info: data });
  } catch (e: any) {
    return errorResponse(e.message ?? 'Network error', 502);
  }
});
