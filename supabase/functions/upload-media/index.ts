// Receive a file (multipart/form-data), upload it to Meta, and return the media id.
// Also stores a copy in Supabase Storage so the UI can render outbound media.
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';
import { uploadMedia } from '../_shared/meta.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const ctype = req.headers.get('content-type') || '';
  if (!ctype.startsWith('multipart/form-data')) {
    return errorResponse('multipart/form-data required');
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  const numberId = form.get('whatsapp_number_id') as string | null;
  if (!file || !numberId) return errorResponse('file and whatsapp_number_id required');

  const sb = adminClient();
  const { data: number, error } = await sb
    .from('whatsapp_numbers')
    .select('id, phone_number_id, access_token')
    .eq('id', numberId)
    .single();
  if (error || !number) return errorResponse('Number not found', 404);

  // Normalise audio MIME type — Chrome records webm but WhatsApp needs ogg/mp4.
  const isAudio = file.type.startsWith('audio/');
  const storageMime = isAudio
    ? (file.type.includes('mp4') ? 'audio/mp4' : 'audio/ogg')
    : file.type;

  // Mirror to storage so we have a stable URL.
  const path = `${number.id}/${crypto.randomUUID()}-${file.name}`;
  const { error: storageErr } = await sb.storage
    .from('media')
    .upload(path, file, { contentType: storageMime, upsert: false });
  if (storageErr) return errorResponse(storageErr.message, 500);
  const { data: pub } = sb.storage.from('media').getPublicUrl(path);

  // For audio: skip Meta's pre-upload and use the Supabase Storage URL as a
  // `link` when sending. Meta validates actual bytes at pre-upload time for
  // audio (causing errors with webm-labeled-as-ogg), but is more permissive
  // when fetching from a URL where it trusts the Content-Type header.
  if (isAudio) {
    return jsonResponse({
      success: true,
      media_id: null,
      public_url: pub.publicUrl,
      filename: file.name,
      mime_type: storageMime,
      size: file.size,
    });
  }

  // Push to Meta (images, videos, documents).
  try {
    const result = await uploadMedia({
      phoneNumberId: number.phone_number_id,
      accessToken: number.access_token,
      file,
      filename: file.name,
      mimeType: file.type,
    });
    return jsonResponse({
      success: true,
      media_id: result.id,
      public_url: pub.publicUrl,
      filename: file.name,
      mime_type: file.type,
      size: file.size,
    });
  } catch (e: any) {
    return errorResponse(e.message ?? 'Upload failed', 502);
  }
});
