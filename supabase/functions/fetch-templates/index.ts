// Fetch templates from Meta and upsert into message_templates for the given number.
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';
import { fetchTemplates } from '../_shared/meta.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const { whatsapp_number_id } = await req.json().catch(() => ({}));
  if (!whatsapp_number_id) return errorResponse('whatsapp_number_id required');

  const sb = adminClient();
  const { data: number, error } = await sb
    .from('whatsapp_numbers')
    .select('id, waba_id, access_token')
    .eq('id', whatsapp_number_id)
    .single();
  if (error || !number) return errorResponse('Number not found', 404);

  try {
    const result = await fetchTemplates({
      wabaId: number.waba_id,
      accessToken: number.access_token,
    });

    const rows = result.data.map((t) => ({
      whatsapp_number_id: number.id,
      template_name: t.name,
      template_id: t.id,
      category: (t.category || 'utility').toLowerCase(),
      language: t.language,
      status: (t.status || 'pending').toLowerCase(),
      components: t.components,
    }));

    if (rows.length) {
      await sb
        .from('message_templates')
        .upsert(rows, { onConflict: 'whatsapp_number_id,template_name,language' });
    }
    return jsonResponse({ success: true, count: rows.length });
  } catch (e: any) {
    return errorResponse(e.message ?? 'Failed to fetch templates', 502);
  }
});
