import { ExternalLink, AlertTriangle, CheckCircle, XCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { WEBHOOK_URL } from '@/lib/constants';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={doCopy}
      className="ml-1 inline-flex items-center gap-0.5 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
    >
      {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Path({ steps }: { steps: string[] }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{s}</span>
          {i < steps.length - 1 && <span className="text-xs text-gray-400">›</span>}
        </span>
      ))}
    </div>
  );
}

function StepCard({
  num,
  title,
  url,
  urlLabel,
  path,
  children,
}: {
  num: number;
  title: string;
  url?: string;
  urlLabel?: string;
  path?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wa-teal text-sm font-bold text-white shadow-sm">
          {num}
        </div>
        <div className="mt-2 w-px flex-1 bg-gray-200" />
      </div>
      <div className="pb-10 flex-1 min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-wa-teal hover:underline"
            >
              {urlLabel ?? url} <ExternalLink size={11} />
            </a>
          )}
        </div>
        {path && <Path steps={path} />}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-sm text-gray-700 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
      <CheckCircle size={14} className="mt-0.5 shrink-0 text-blue-500" />
      <div>{children}</div>
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
      <div>{children}</div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px] text-gray-800">
      {children}
    </span>
  );
}

interface ErrorRow {
  code: string;
  meaning: string;
  fix: string;
  level: 'error' | 'warn';
}

const ERRORS: ErrorRow[] = [
  {
    code: 'Error 190 — Invalid OAuth access token',
    meaning: 'Your access token has expired or been invalidated.',
    fix: 'Regenerate a new permanent token via Business Settings → System Users → Generate New Token.',
    level: 'error',
  },
  {
    code: 'Error 100 — Invalid parameter',
    meaning: 'A required field is missing or in the wrong format.',
    fix: 'Check that the phone number is in E.164 format: +[country code][number], e.g. +8801712345678.',
    level: 'error',
  },
  {
    code: 'Error 131047 — Re-engagement message',
    meaning: 'You tried to send a free-form message outside the 24-hour window.',
    fix: 'Use an approved template message instead. Go to Templates in the sidebar and send a template.',
    level: 'warn',
  },
  {
    code: 'Error 131030 — Template not found or rejected',
    meaning: 'The template you sent doesn\'t exist or was rejected by Meta.',
    fix: 'Check template status in Meta Business Manager → Account Tools → Message Templates. Approved templates appear in the Templates page.',
    level: 'warn',
  },
  {
    code: 'Error 131026 — Recipient not on WhatsApp',
    meaning: 'The destination phone number is not registered on WhatsApp.',
    fix: 'Verify the number with the contact. Make sure the country code is correct.',
    level: 'error',
  },
  {
    code: 'Webhook 403 Forbidden (verification fails)',
    meaning: 'The verify token you entered in Meta does not match what is stored.',
    fix: 'Copy the verify token exactly from the Add Number popup and paste it into Meta → Webhook → Edit → Verify Token field.',
    level: 'error',
  },
  {
    code: '"Failed to fetch" when sending a message',
    meaning: 'The edge functions are not deployed to your Supabase project.',
    fix: 'Run `npm run deploy` in your terminal. Make sure SUPABASE_ACCESS_TOKEN is set in .env.local.',
    level: 'warn',
  },
  {
    code: 'Duplicate contacts appear in the list',
    meaning: 'Incoming phone numbers are stored without the + prefix causing two separate rows.',
    fix: 'Redeploy the whatsapp-webhook function: `npm run deploy`. The latest version normalizes all numbers to E.164.',
    level: 'warn',
  },
  {
    code: '401 Unauthorized when running npm run deploy',
    meaning: 'Your Supabase access token has expired.',
    fix: 'Go to supabase.com/dashboard/account/tokens → Generate new token → update SUPABASE_ACCESS_TOKEN in .env.local → run `npm run deploy` again.',
    level: 'error',
  },
];

export function SetupGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business API Setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Follow these steps to connect your WhatsApp number to this platform. Takes about 15 minutes.
        </p>
      </div>

      {/* Steps */}
      <div>
        {/* Step 1 */}
        <StepCard
          num={1}
          title="Create a Meta Developer Account"
          url="https://developers.facebook.com"
          urlLabel="developers.facebook.com"
          path={['developers.facebook.com', 'Register / Log in']}
        >
          <ol className="list-decimal space-y-2 pl-5">
            <li>Open <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-wa-teal underline">developers.facebook.com</a> and sign in with your Facebook account (or create one).</li>
            <li>Accept the Meta Developer Terms when prompted.</li>
            <li>Verify your account with a phone number if asked.</li>
          </ol>
          <InfoBox>You need a Facebook account to use the Meta Developer platform. A personal account is fine — you do not need a business account just for this step.</InfoBox>
        </StepCard>

        {/* Step 2 */}
        <StepCard
          num={2}
          title="Create a Meta App"
          url="https://developers.facebook.com/apps"
          urlLabel="My Apps"
          path={['developers.facebook.com', 'My Apps', 'Create App']}
        >
          <ol className="list-decimal space-y-2 pl-5">
            <li>Click the green <strong>Create App</strong> button.</li>
            <li>Under "What do you want your app to do?", choose <strong>Other</strong>, then click Next.</li>
            <li>Select app type <strong>Business</strong>, then click Next.</li>
            <li>Enter an App Name (e.g. "My WhatsApp Platform") and a contact email.</li>
            <li>If you have a Business Portfolio, attach it. Otherwise you can skip this for now.</li>
            <li>Click <strong>Create App</strong>. You'll land on the App Dashboard.</li>
          </ol>
        </StepCard>

        {/* Step 3 */}
        <StepCard
          num={3}
          title="Add the WhatsApp Product to Your App"
          path={['App Dashboard', 'Add Products', 'WhatsApp', 'Set up']}
        >
          <ol className="list-decimal space-y-2 pl-5">
            <li>On the App Dashboard, scroll down to find the <strong>Add Products to Your App</strong> section.</li>
            <li>Find <strong>WhatsApp</strong> and click <strong>Set up</strong>.</li>
            <li>Accept the WhatsApp Business Terms of Service if prompted.</li>
            <li>You'll be redirected to the WhatsApp section in the left sidebar. Click <strong>API Setup</strong>.</li>
          </ol>
          <InfoBox>After adding WhatsApp, a test phone number is provided by Meta for free. You can use it to test sending messages before adding your real number.</InfoBox>
        </StepCard>

        {/* Step 4 */}
        <StepCard
          num={4}
          title="Get Your Phone Number ID"
          path={['App Dashboard', 'WhatsApp', 'API Setup']}
        >
          <ol className="list-decimal space-y-2 pl-5">
            <li>Go to <strong>WhatsApp → API Setup</strong> in the left sidebar.</li>
            <li>Under the <strong>Send and receive messages</strong> section, find the <strong>From</strong> dropdown.</li>
            <li>Select your phone number from the dropdown (or the test number if you haven't added a real one yet).</li>
            <li>
              The <strong>Phone Number ID</strong> is displayed just below the dropdown — it's a long numeric string like <Code>123456789012345</Code>.
            </li>
            <li>Copy it and paste it into the <strong>Phone Number ID</strong> field in the Add Number popup.</li>
          </ol>
          <WarnBox>
            Phone Number ID is different from your actual phone number. It's a Meta-assigned ID, not the digits of the phone number itself.
          </WarnBox>
        </StepCard>

        {/* Step 5 */}
        <StepCard
          num={5}
          title="Get Your WhatsApp Business Account ID (WABA ID)"
          path={['App Dashboard', 'WhatsApp', 'API Setup']}
        >
          <ol className="list-decimal space-y-2 pl-5">
            <li>Still on the <strong>WhatsApp → API Setup</strong> page, look below the phone number section.</li>
            <li>
              Find the <strong>WhatsApp Business Account ID</strong> — it looks like <Code>987654321098765</Code>.
            </li>
            <li>Copy it and paste it into the <strong>WABA ID</strong> field in the Add Number popup.</li>
          </ol>
          <InfoBox>
            Alternatively: go to <strong>Business Settings</strong> (business.facebook.com) → <strong>Accounts</strong> → <strong>WhatsApp Accounts</strong> → select your account. The ID appears in the URL and in the account info panel.
          </InfoBox>
        </StepCard>

        {/* Step 6 */}
        <StepCard
          num={6}
          title="Generate a Permanent Access Token"
          url="https://business.facebook.com/settings/system-users"
          urlLabel="Business Settings"
          path={['business.facebook.com', 'Settings', 'Users', 'System Users']}
        >
          <ol className="list-decimal space-y-2 pl-5">
            <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noreferrer" className="text-wa-teal underline">business.facebook.com</a> → click the <strong>Settings</strong> gear icon (bottom-left).</li>
            <li>In the left panel go to <strong>Users → System Users</strong>.</li>
            <li>Click <strong>Add</strong> — give it a name (e.g. "WhatsApp Bot") and set the role to <strong>Admin</strong>.</li>
            <li>Click <strong>Add Assets</strong> → select <strong>WhatsApp Accounts</strong> → find your WABA → enable <strong>Manage WhatsApp Business</strong> → click Save.</li>
            <li>Click <strong>Generate New Token</strong> → select your app from the dropdown.</li>
            <li>
              Enable these two permissions:
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-gray-600">
                <li><Code>whatsapp_business_messaging</Code></li>
                <li><Code>whatsapp_business_management</Code></li>
              </ul>
            </li>
            <li>Click <strong>Generate Token</strong>.</li>
          </ol>
          <WarnBox>
            The token is shown only once. Copy it immediately and paste it into the <strong>Access Token</strong> field in the Add Number popup. If you lose it, you must generate a new one.
          </WarnBox>
        </StepCard>

        {/* Step 7 */}
        <StepCard
          num={7}
          title="Configure the Webhook"
          path={['App Dashboard', 'WhatsApp', 'Configuration', 'Webhook']}
        >
          <ol className="list-decimal space-y-2 pl-5">
            <li>In your App Dashboard, go to <strong>WhatsApp → Configuration</strong>.</li>
            <li>In the <strong>Webhook</strong> section, click <strong>Edit</strong>.</li>
            <li>
              Set <strong>Callback URL</strong> to:
              <div className="mt-1 flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 font-mono text-[12px] text-gray-800 break-all">
                {WEBHOOK_URL}
                <CopyButton text={WEBHOOK_URL} />
              </div>
            </li>
            <li>Set <strong>Verify Token</strong> to the token shown in the Add Number popup (auto-generated for each number).</li>
            <li>Click <strong>Verify and Save</strong>. Meta will call your webhook URL to confirm it responds correctly.</li>
            <li>After saving, find <strong>Webhook Fields</strong> → locate <strong>messages</strong> → click <strong>Subscribe</strong>.</li>
          </ol>
          <InfoBox>
            The Callback URL must be publicly accessible. It points to your Supabase edge function which is already live once you've run <Code>npm run deploy</Code>. Localhost URLs will not work.
          </InfoBox>
        </StepCard>

        {/* Step 8 - final */}
        <div className="flex gap-5">
          <div className="flex flex-col items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
              <CheckCircle size={20} className="text-white" />
            </div>
          </div>
          <div className="pb-4 flex-1">
            <h2 className="mb-1 text-base font-semibold text-gray-900">You're all set</h2>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-gray-700 space-y-2">
              <p>Go back to <strong>WhatsApp Numbers</strong> in the sidebar, click <strong>Add number</strong>, and fill in all the values you copied above. Click <strong>Add number</strong> to save.</p>
              <p>Once saved, go to the <strong>Inbox</strong> to start sending messages. Send a template first if no conversation has started within the last 24 hours.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Reference */}
      <div className="mt-8">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Error Reference</h2>
        <p className="mb-5 text-sm text-gray-500">Common errors you might encounter and how to resolve them.</p>

        <div className="space-y-3">
          {ERRORS.map((err) => (
            <div
              key={err.code}
              className={`rounded-xl border p-4 ${
                err.level === 'error'
                  ? 'border-red-100 bg-red-50'
                  : 'border-amber-100 bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {err.level === 'error' ? (
                  <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                ) : (
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                )}
                <div className="min-w-0">
                  <div className="mb-1 text-sm font-semibold text-gray-900">{err.code}</div>
                  <div className="mb-1.5 text-xs text-gray-600">{err.meaning}</div>
                  <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-gray-700">
                    <span className="font-medium">Fix: </span>{err.fix}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
        <p className="font-medium text-gray-800 mb-1">Still stuck?</p>
        <p>Check the official Meta documentation at <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noreferrer" className="text-wa-teal underline">developers.facebook.com/docs/whatsapp/cloud-api</a> for full API reference, or review error codes at <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes" target="_blank" rel="noreferrer" className="text-wa-teal underline">WhatsApp Error Codes</a>.</p>
      </div>
    </div>
  );
}
