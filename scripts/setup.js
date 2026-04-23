#!/usr/bin/env node
/**
 * One-command full project setup for any Supabase project.
 *
 * 1. Copy .env.example → .env.local and fill in all values.
 * 2. Run:  npm run setup
 *
 * What it does:
 *   [1] Run DB migration (creates all tables + RLS)
 *   [2] Create admin auth user
 *   [3] Seed admin profile row
 *   [4] Create media storage bucket
 *   [5] Deploy all edge functions
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// ── Load .env.local ─────────────────────────────────────────────
function loadEnv() {
  const path = join(root, '.env.local');
  if (!existsSync(path)) {
    console.error('\n  ✗  .env.local not found.');
    console.error('  Copy .env.example → .env.local and fill in your credentials.\n');
    process.exit(1);
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx < 0) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim();
    if (v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv();

// ── Read config from env ────────────────────────────────────────
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN || '';
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';
const ADMIN_NAME    = process.env.ADMIN_NAME || 'Admin';

// Extract project ref from URL  e.g. https://abcdef.supabase.co → abcdef
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';

if (!SUPABASE_URL || !PROJECT_REF) {
  console.error('\n  ✗  VITE_SUPABASE_URL is missing or invalid in .env.local\n');
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────
const log  = (m) => console.log(`  ✓  ${m}`);
const warn = (m) => console.warn(`  ⚠  ${m}`);
const fail = (m) => console.error(`  ✗  ${m}`);

async function managementQuery(sql) {
  if (!ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN not set');
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`Management API ${res.status}: ${data?.message || text}`);
  return data;
}

// ── Step 1: Run migrations ───────────────────────────────────────
async function runMigrations() {
  console.log('\n[1/5] Applying database schema…');
  if (!ACCESS_TOKEN) {
    warn('SUPABASE_ACCESS_TOKEN not set — skipping auto-migration.');
    warn('Run manually in Supabase → SQL Editor:');
    warn('  supabase/migrations/20260101000000_initial_schema.sql');
    warn('  supabase/seed.sql');
    return;
  }

  const migSql  = readFileSync(join(root, 'supabase/migrations/20260101000000_initial_schema.sql'), 'utf8');
  const seedSql = readFileSync(join(root, 'supabase/seed.sql'), 'utf8');

  for (const [label, sql] of [['Migration', migSql], ['Seed', seedSql]]) {
    try {
      await managementQuery(sql);
      log(`${label} applied`);
    } catch (e) {
      const msg = e.message.toLowerCase();
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('unique')) {
        log(`${label} already exists (skipped)`);
      } else {
        fail(`${label} failed: ${e.message}`);
        warn('Run it manually in Supabase → SQL Editor instead.');
      }
    }
  }
}

// ── Step 2: Create auth user ─────────────────────────────────────
async function createAuthUser() {
  console.log('\n[2/5] Creating admin auth user…');
  if (!SERVICE_KEY) {
    warn('SUPABASE_SERVICE_ROLE_KEY not set — skipping.');
    warn(`Create manually: Supabase → Authentication → Users → Add user`);
    warn(`  Email: ${ADMIN_EMAIL} | Password: ${ADMIN_PASSWORD} | Auto Confirm: YES`);
    return;
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.admin.createUser({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
    email_confirm: true, user_metadata: { full_name: ADMIN_NAME },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('duplicate')) log('Auth user already exists');
    else fail(`Auth user creation failed: ${error.message}`);
  } else {
    log(`Auth user created: ${data.user?.email}`);
  }
}

// ── Step 3: Seed admin profile ───────────────────────────────────
async function seedAdminProfile() {
  console.log('\n[3/5] Seeding admin profile…');
  if (!SERVICE_KEY) { warn('No SERVICE_KEY — skipping.'); return; }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { error } = await sb.from('admins').upsert(
    { email: ADMIN_EMAIL, password_hash: 'managed-by-supabase-auth', full_name: ADMIN_NAME },
    { onConflict: 'email' },
  );
  if (error) {
    if (error.code === '42P01') warn('admins table not found — run migrations first.');
    else fail(`Admin profile seed failed: ${error.message}`);
  } else {
    log('Admin profile seeded');
  }
}

// ── Step 4: Create storage bucket ───────────────────────────────
async function createStorageBucket() {
  console.log('\n[4/5] Creating media storage bucket…');
  if (!SERVICE_KEY) {
    warn('No SERVICE_KEY — skipping.');
    warn('Create manually: Supabase → Storage → New bucket → name: media → Public: YES');
    return;
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { error } = await sb.storage.createBucket('media', {
    public: true,
    fileSizeLimit: 52_428_800,
    allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/*'],
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('exists')) log('Storage bucket "media" already exists');
    else fail(`Storage bucket creation failed: ${error.message}`);
  } else {
    log('Storage bucket "media" created (public, 50 MB limit)');
  }
}

// ── Step 5: Deploy all edge functions ───────────────────────────
async function deployFunctions() {
  console.log('\n[5/5] Deploying edge functions…');
  if (!ACCESS_TOKEN) {
    warn('No ACCESS_TOKEN — skipping auto-deploy.');
    warn('Run manually:  npm run deploy');
    return;
  }

  const functions = [
    'whatsapp-webhook',
    'send-message',
    'send-template',
    'mark-read',
    'fetch-templates',
    'test-connection',
    'upload-media',
    'log-message',
    'update-profile',
    'delete-message',
    'create-conversation',
    'delete-conversation',
  ];

  const env = { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN };
  let ok = 0, failed = 0;

  for (const fn of functions) {
    process.stdout.write(`  → ${fn.padEnd(25)}`);
    try {
      execSync(
        `npx supabase functions deploy ${fn} --project-ref ${PROJECT_REF}`,
        { cwd: root, env, stdio: 'pipe' },
      );
      console.log('✓');
      ok++;
    } catch (e) {
      const msg = e.stderr?.toString().trim().split('\n').pop() ?? e.message;
      console.log(`✗  ${msg}`);
      failed++;
    }
  }

  log(`${ok} functions deployed${failed ? `, ${failed} failed` : ''}`);
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  WhatsApp Business Platform — Fresh Setup');
  console.log(`  Project : ${PROJECT_REF}`);
  console.log(`  URL     : ${SUPABASE_URL}`);
  console.log(`  Admin   : ${ADMIN_EMAIL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await runMigrations();
  await createAuthUser();
  await seedAdminProfile();
  await createStorageBucket();
  await deployFunctions();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Setup complete!');
  console.log(`  Login : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('  Start : npm run dev');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((e) => { console.error('\nFatal:', e.message); process.exit(1); });
