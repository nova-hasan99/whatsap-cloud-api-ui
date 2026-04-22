# WhatsApp Business Management Platform

A production-ready React + Supabase application for managing multiple WhatsApp Business numbers with a WhatsApp-Web-style inbox.

- **Stack:** Vite + React 18 + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- **Backend:** Seven Deno-based Supabase Edge Functions handle the Meta WhatsApp Cloud API webhook + outbound message API.
- **UI:** Pixel-faithful WhatsApp Web layout — sidebar / conversation list / chat area, multi-number support, 24-hour window enforcement, templates, media, status icons.

## Quick start

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Run
npm run dev
```

You'll need:

1. A Supabase project (you said you have one) — apply the SQL in `supabase/migrations/` and `supabase/seed.sql`.
2. The default admin user must be created in **Supabase Auth → Users → Add user** with `lattice.hasan.dev@gmail.com` / `123456`.
3. A Supabase Storage bucket named `media` (public read).
4. The seven edge functions deployed via the Supabase CLI.
5. A WhatsApp Cloud API app on Meta with a webhook pointing at the deployed `whatsapp-webhook` function.

Step-by-step instructions are in [`SETUP.md`](./SETUP.md).

## Project layout

```
.
├── index.html                       Vite entry HTML
├── src/
│   ├── main.tsx                     React root + Router
│   ├── App.tsx                      Routes (admin + inbox)
│   ├── lib/                         supabase client, types, utils
│   ├── contexts/                    AuthContext, ToastContext
│   ├── hooks/                       useNumbers, useConversations, useMessages, useStats…
│   ├── components/
│   │   ├── ui/                      Button, Input, Modal, Avatar, Badge, Dropdown, …
│   │   ├── layout/                  AdminLayout, Sidebar, ProtectedRoute, PageHeader
│   │   ├── admin/                   StatCard, NumberFormModal
│   │   └── inbox/                   ConversationsList, ChatArea, ChatHeader, ChatFooter,
│   │                                MessageBubble, TemplateSelector, MediaLightbox, …
│   └── pages/                       LoginPage, DashboardPage, NumbersPage, TemplatesPage, InboxPage
└── supabase/
    ├── config.toml
    ├── migrations/                  SQL schema, RLS, triggers, realtime
    ├── seed.sql                     Default admin profile row
    └── functions/
        ├── _shared/                 cors, supabase, meta helpers
        ├── whatsapp-webhook/        GET verify + POST messages/statuses
        ├── send-message/            text + media outbound
        ├── send-template/           template send (works after window expiry)
        ├── mark-read/               mark inbound as read on Meta
        ├── fetch-templates/         sync from Meta
        ├── test-connection/         verify creds
        └── upload-media/            multipart → Storage + Meta
```

## Scripts

```bash
npm run dev         # Vite dev server (http://localhost:5173)
npm run build       # production build
npm run typecheck   # tsc --noEmit
```

## Notes & next steps

- **Security.** RLS is enabled and only authenticated users can read/write. Edge functions use the service-role key. The `admins.password_hash` column exists for schema parity but actual auth is delegated to Supabase Auth — drop it later if you don't want it.
- **Encryption-at-rest of access tokens.** Out of the box, tokens are stored in plaintext in the `whatsapp_numbers` table. For production, wrap inserts/reads in [pgsodium](https://github.com/michelp/pgsodium) or move tokens to the Vault.
- **Rate limiting.** Add via Supabase's `pg_net` + a tiny rate-limit table, or front edge functions with a [Cloudflare Worker](https://developers.cloudflare.com/workers/).
- **Media downloads.** Inbound media currently store the Meta `media_id`; if you want the bytes mirrored to Supabase Storage automatically (for permanent display), call `fetchMediaUrl` + `downloadMedia` in `whatsapp-webhook` and upload them — the helpers are already in `supabase/functions/_shared/meta.ts`.
- **Multi-language UI** and admin **activity log** are stubbed but not implemented.
