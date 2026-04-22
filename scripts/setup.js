#!/usr/bin/env node
/**
 * One-command full Supabase project setup.
 *
 * Required env vars (fill in .env.local first):
 *   SUPABASE_ACCESS_TOKEN   — Dashboard → Account → Access Tokens
 *   SUPABASE_SERVICE_ROLE_KEY — Dashboard → Project Settings → API → service_role
 *   VITE_SUPABASE_URL       — already set in .env.local
 *
 * Usage:
 *   node scripts/setup.js
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// ---------- load .env.local ----------
function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (v && !process.env[k]) process.env[k] = v;
    }
  } catch { /* .env.local might not exist */ }
}
loadEnv();

const PROJECT_REF     = 'mrsbiuasehptijcypbam';
const SUPABASE_URL    = process.env.VITE_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ACCESS_TOKEN    = process.env.SUPABASE_ACCESS_TOKEN || '';
const ADMIN_EMAIL     = 'lattice.hasan.dev@gmail.com';
const ADMIN_PASSWORD  = '123456';
const ADMIN_NAME      = 'Hasan';

// ---------- helpers ----------
function log(msg)  { console.log(`  ✓  ${msg}`); }
function warn(msg) { console.warn(`  ⚠  ${msg}`); }
function fail(msg) { console.error(`  ✗  ${msg}`); }

async function managementQuery(sql) {
  if (!ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN not set');
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.message || data?.error || text;
    throw new Error(`Management API ${res.status}: ${msg}`);
  }
  return data;
}

// ---------- step 1: run migrations ----------
async function runMigrations() {
  console.log('\n[1/5] Applying database schema via Management API…');
  if (!ACCESS_TOKEN) {
    warn('SUPABASE_ACCESS_TOKEN not set — skipping migration.');
    warn('Run the SQL manually in Supabase → SQL Editor:');
    warn('  supabase/migrations/20260101000000_initial_schema.sql');
    warn('  supabase/seed.sql');
    return;
  }
  const migrationSql = readFileSync(
    join(root, 'supabase/migrations/20260101000000_initial_schema.sql'), 'utf8');
  const seedSql = readFileSync(join(root, 'supabase/seed.sql'), 'utf8');

  try {
    await managementQuery(migrationSql);
    log('Migration applied');
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('duplicate')) {
      log('Schema already exists (skipped)');
    } else {
      fail(`Migration failed: ${e.message}`);
      warn('Run it manually in Supabase → SQL Editor instead.');
    }
  }

  try {
    await managementQuery(seedSql);
    log('Seed applied');
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('duplicate') || e.message.includes('unique')) {
      log('Seed already exists (skipped)');
    } else {
      fail(`Seed failed: ${e.message}`);
    }
  }
}

// ---------- step 2: create auth user ----------
async function createAuthUser() {
  console.log('\n[2/5] Creating auth user…');
  if (!SERVICE_KEY) {
    warn('SUPABASE_SERVICE_ROLE_KEY not set — skipping auth user creation.');
    warn(`Create manually: Supabase → Authentication → Users → Add user`);
    warn(`  Email: ${ADMIN_EMAIL}`);
    warn(`  Password: ${ADMIN_PASSWORD}`);
    warn(`  Auto Confirm User: YES`);
    return;
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb.auth.admin.createUser({
    email:            ADMIN_EMAIL,
    password:         ADMIN_PASSWORD,
    email_confirm:    true,
    user_metadata:    { full_name: ADMIN_NAME },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('duplicate')) {
      log(`Auth user already exists`);
    } else {
      fail(`Auth user creation failed: ${error.message}`);
    }
  } else {
    log(`Auth user created: ${data.user?.email}`);
  }
}

// ---------- step 3: seed admin profile ----------
async function seedAdminProfile() {
  console.log('\n[3/5] Seeding admin profile row…');
  if (!SERVICE_KEY) {
    warn('SUPABASE_SERVICE_ROLE_KEY not set — skipping admin profile seed.');
    return;
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await sb.from('admins').upsert(
    { email: ADMIN_EMAIL, password_hash: 'managed-by-supabase-auth', full_name: ADMIN_NAME },
    { onConflict: 'email' },
  );
  if (error) {
    if (error.code === '42P01') {
      warn('admins table not found — run migrations first.');
    } else {
      fail(`Admin profile seed failed: ${error.message}`);
    }
  } else {
    log(`Admin profile seeded`);
  }
}

// ---------- step 4: create storage bucket ----------
async function createStorageBucket() {
  console.log('\n[4/5] Creating media storage bucket…');
  if (!SERVICE_KEY) {
    warn('SUPABASE_SERVICE_ROLE_KEY not set — skipping storage bucket creation.');
    warn('Create manually: Supabase → Storage → New bucket');
    warn('  Name: media  |  Public: YES');
    return;
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await sb.storage.createBucket('media', {
    public:            true,
    fileSizeLimit:     52_428_800, // 50 MB
    allowedMimeTypes:  ['image/*', 'video/*', 'audio/*', 'application/*'],
  });

  if (error) {
    if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('exists')) {
      log('Storage bucket "media" already exists');
    } else {
      fail(`Storage bucket creation failed: ${error.message}`);
    }
  } else {
    log('Storage bucket "media" created (public)');
  }
}

// ---------- step 5: deploy edge functions ----------
async function deployFunctions() {
  console.log('\n[5/5] Deploying edge functions…');
  if (!ACCESS_TOKEN) {
    warn('SUPABASE_ACCESS_TOKEN not set — skipping automatic deploy.');
    console.log('  →  To deploy manually, run:');
    console.log(`       npx supabase login --token YOUR_PAT`);
    console.log(`       npx supabase link --project-ref ${PROJECT_REF}`);
    console.log(`       npx supabase functions deploy whatsapp-webhook --no-verify-jwt`);
    console.log(`       npx supabase functions deploy send-message send-template mark-read fetch-templates test-connection upload-media`);
    console.log(`       npx supabase secrets set META_GRAPH_VERSION=v21.0`);
    return;
  }

  const env = { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN };

  function run(cmd) {
    try {
      execSync(cmd, { cwd: root, env, stdio: 'inherit' });
      return true;
    } catch (e) {
      fail(`Command failed: ${cmd}`);
      return false;
    }
  }

  const functions = [
    { name: 'whatsapp-webhook', noJwt: true },
    { name: 'send-message' },
    { name: 'send-template' },
    { name: 'mark-read' },
    { name: 'fetch-templates' },
    { name: 'test-connection' },
    { name: 'upload-media' },
  ];

  const ref = `--project-ref ${PROJECT_REF}`;
  for (const fn of functions) {
    const jwtFlag = fn.noJwt ? ' --no-verify-jwt' : '';
    console.log(`  Deploying ${fn.name}…`);
    run(`npx supabase functions deploy ${fn.name} ${ref} --use-api${jwtFlag}`);
  }

  run(`npx supabase secrets set META_GRAPH_VERSION=v21.0 ${ref}`);
  log('Edge functions deployed');
}

// ---------- main ----------
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  WhatsApp Business Platform — Supabase Setup');
  console.log(`  Project: ${PROJECT_REF}`);
  console.log(`  URL:     ${SUPABASE_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!ACCESS_TOKEN && !SERVICE_KEY) {
    console.log('\n  ⚠  No credentials found in .env.local.');
    console.log('  Please fill in .env.local:');
    console.log('    SUPABASE_ACCESS_TOKEN  → Dashboard → Account → Access Tokens');
    console.log('    SUPABASE_SERVICE_ROLE_KEY → Dashboard → Project Settings → API');
    console.log('\n  Then re-run:  node scripts/setup.js\n');
    process.exit(1);
  }

  await runMigrations();
  await createAuthUser();
  await seedAdminProfile();
  await createStorageBucket();
  await deployFunctions();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Setup complete!');
  console.log(`  Login:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('  Start:    npm run dev');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((e) => {
  console.error('\nFatal error:', e.message);
  process.exit(1);
});
