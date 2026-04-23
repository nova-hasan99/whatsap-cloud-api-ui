// Hard-delete a message from the dashboard DB and remove any associated
// media file from Supabase Storage. Does NOT call Meta API — the message
// stays on WhatsApp; this only removes it from this project.
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { message_id: string };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON'); }
  if (!body.message_id) return errorResponse('message_id required');

  const sb = adminClient();

  const { data: msg, error: msgErr } = await sb
    .from('messages')
    .select('id, content')
    .eq('id', body.message_id)
    .single();
  if (msgErr || !msg) return errorResponse('Message not found', 404);

  // Delete associated media from Supabase Storage if present
  const content = (msg.content ?? {}) as Record<string, any>;
  const publicUrl: string | undefined = content.public_url;
  if (publicUrl) {
    // Extract the storage path from the public URL:
    // https://<ref>.supabase.co/storage/v1/object/public/media/<path>
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
    if (match) {
      await sb.storage.from('media').remove([decodeURIComponent(match[1])]);
    }
  }

  // Hard-delete the message row
  const { error: delErr } = await sb.from('messages').delete().eq('id', msg.id);
  if (delErr) return errorResponse(delErr.message, 500);

  return jsonResponse({ success: true });
});
