// Get or update a WhatsApp Business number's public profile (about text + profile picture).
import { adminClient } from '../_shared/supabase.ts';
import { errorResponse, jsonResponse, preflight } from '../_shared/cors.ts';
import {
  getWhatsAppProfile,
  updateWhatsAppProfile,
  uploadProfilePicture,
} from '../_shared/meta.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const sb = adminClient();
  const url = new URL(req.url);

  // ── GET: return current profile ──────────────────────────────
  if (req.method === 'GET') {
    const numberId = url.searchParams.get('whatsapp_number_id');
    if (!numberId) return errorResponse('whatsapp_number_id required');

    const { data: number, error } = await sb
      .from('whatsapp_numbers')
      .select('phone_number_id, access_token')
      .eq('id', numberId)
      .single();
    if (error || !number) return errorResponse('Number not found', 404);

    try {
      const profile = await getWhatsAppProfile({
        phoneNumberId: number.phone_number_id,
        accessToken: number.access_token,
      });
      return jsonResponse(profile);
    } catch (e: any) {
      return errorResponse(e.message ?? 'Failed to fetch profile', 502);
    }
  }

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  // ── POST: update profile ──────────────────────────────────────
  const ctype = req.headers.get('content-type') || '';
  let numberId: string;
  let about: string | null = null;
  let file: File | null = null;

  if (ctype.startsWith('multipart/form-data')) {
    const form = await req.formData();
    numberId = (form.get('whatsapp_number_id') as string) ?? '';
    about = (form.get('about') as string | null);
    file = form.get('file') as File | null;
  } else {
    let body: any;
    try { body = await req.json(); } catch { return errorResponse('Invalid JSON'); }
    numberId = body.whatsapp_number_id ?? '';
    about = body.about ?? null;
  }

  if (!numberId) return errorResponse('whatsapp_number_id required');

  const { data: number, error } = await sb
    .from('whatsapp_numbers')
    .select('phone_number_id, access_token')
    .eq('id', numberId)
    .single();
  if (error || !number) return errorResponse('Number not found', 404);

  const creds = {
    phoneNumberId: number.phone_number_id,
    accessToken: number.access_token,
  };

  // Update about text
  if (about !== null) {
    try {
      await updateWhatsAppProfile(creds, { about });
    } catch (e: any) {
      return errorResponse(e.message ?? 'Failed to update about text', 502);
    }
  }

  // Update profile picture
  if (file) {
    try {
      const handle = await uploadProfilePicture(
        creds,
        file,
        file.name,
        file.type || 'image/jpeg',
      );
      await updateWhatsAppProfile(creds, { profile_picture_handle: handle });
    } catch (e: any) {
      return errorResponse(e.message ?? 'Failed to update profile picture', 502);
    }
  }

  return jsonResponse({ success: true });
});
