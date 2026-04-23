// Permanently delete a conversation, all its messages, and any associated
// media files from Supabase Storage.
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { conversation_id: string };
  try { body = await req.json(); } catch { return errorResponse('Invalid JSON'); }
  if (!body.conversation_id) return errorResponse('conversation_id required');

  const sb = adminClient();

  // Load messages to find attached media
  const { data: messages } = await sb
    .from('messages')
    .select('content')
    .eq('conversation_id', body.conversation_id);

  // Collect storage keys for any media files
  const mediaKeys: string[] = [];
  for (const msg of messages ?? []) {
    const url = ((msg.content ?? {}) as Record<string, any>).public_url as string | undefined;
    if (url) {
      const match = url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
      if (match) mediaKeys.push(decodeURIComponent(match[1]));
    }
  }
  if (mediaKeys.length > 0) {
    await sb.storage.from('media').remove(mediaKeys);
  }

  // Delete messages then conversation
  await sb.from('messages').delete().eq('conversation_id', body.conversation_id);

  const { error } = await sb.from('conversations').delete().eq('id', body.conversation_id);
  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ success: true });
});
