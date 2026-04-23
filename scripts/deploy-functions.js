#!/usr/bin/env node
// Deploys all Supabase edge functions using credentials from .env.local
// Usage: npm run deploy

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local
const envPath = resolve(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.error('❌  .env.local not found');
  process.exit(1);
}

const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const token = env.SUPABASE_ACCESS_TOKEN;
const url   = env.VITE_SUPABASE_URL ?? '';
const ref   = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!token) {
  console.error('❌  SUPABASE_ACCESS_TOKEN not found in .env.local');
  console.error('   Get one at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}
if (!ref) {
  console.error('❌  Could not extract project ref from VITE_SUPABASE_URL');
  process.exit(1);
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

console.log(`\nDeploying ${functions.length} functions to project: ${ref}\n`);

let ok = 0;
let fail = 0;

for (const fn of functions) {
  process.stdout.write(`  → ${fn.padEnd(25)}`);
  try {
    execSync(
      `npx supabase functions deploy ${fn} --project-ref ${ref}`,
      { env: { ...process.env, SUPABASE_ACCESS_TOKEN: token }, stdio: 'pipe' }
    );
    console.log('✓');
    ok++;
  } catch (e) {
    const msg = e.stderr?.toString().trim().split('\n').pop() ?? e.message;
    console.log(`✗  ${msg}`);
    fail++;
  }
}

console.log(`\n${ok} deployed, ${fail} failed.\n`);
if (fail > 0) process.exit(1);
