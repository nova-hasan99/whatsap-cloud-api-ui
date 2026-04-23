import { corsHeaders, jsonResponse, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  return jsonResponse({ ok: true, timestamp: new Date().toISOString() });
});
