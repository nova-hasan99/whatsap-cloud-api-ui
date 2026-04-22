# Setup guide

End-to-end steps to get the platform live, from a fresh Supabase project to a working WhatsApp message round-trip.

---

## 1. Frontend env vars

```bash
cp .env.example .env.local
```

Fill these in:

| Variable                  | Where to find it                                                          |
|---------------------------|---------------------------------------------------------------------------|
| `VITE_SUPABASE_URL`       | Supabase → Project Settings → API → Project URL                           |
| `VITE_SUPABASE_ANON_KEY`  | Supabase → Project Settings → API → `anon` `public` key                   |
| `VITE_WEBHOOK_URL`        | `https://<your-project>.supabase.co/functions/v1/whatsapp-webhook`        |

```bash
npm install
npm run dev
```

The app should boot at <http://localhost:5173>.

---

## 2. Apply the database schema

In Supabase → SQL Editor, paste and run **both** files in order:

1. `supabase/migrations/20260101000000_initial_schema.sql`
2. `supabase/seed.sql`

(or, if you're using the Supabase CLI: `supabase db push`)

This creates the five tables, indexes, RLS policies, the realtime publication, the conversation-touch trigger, and the default admin profile row.

---

## 3. Create the admin auth user

The seed only creates the *profile* row. You also need an actual auth user.

1. Supabase → **Authentication → Users → Add user**
2. Email: `lattice.hasan.dev@gmail.com`
3. Password: `123456`
4. **Auto Confirm User**: yes

Login with these credentials in the app.

---

## 4. Storage bucket for media

Supabase → **Storage → New bucket**

- Name: `media`
- Public bucket: **yes** (so the inbox can render images via `getPublicUrl`)

(For tighter security, keep it private and switch the upload function to return signed URLs instead.)

---

## 5. Deploy the edge functions

You'll need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and your project linked:

```bash
supabase link --project-ref <your-project-ref>
```

Then deploy each function. The `whatsapp-webhook` function must be public (no JWT verification) so Meta can hit it; that's already configured in `supabase/config.toml`.

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy send-message
supabase functions deploy send-template
supabase functions deploy mark-read
supabase functions deploy fetch-templates
supabase functions deploy test-connection
supabase functions deploy upload-media
```

(Optional) override the Meta Graph API version per environment:

```bash
supabase secrets set META_GRAPH_VERSION=v21.0
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — you don't need to set them.

---

## 6. Set up your Meta WhatsApp app

In <https://developers.facebook.com/apps>:

1. Create a new app (or pick an existing one) → add the **WhatsApp** product.
2. Under **WhatsApp → API Setup**, note:
   - **Phone number ID**
   - **WhatsApp Business Account ID** (from Settings → WhatsApp → Configuration)
3. Generate a **System User permanent access token** with `whatsapp_business_messaging` and `whatsapp_business_management` scopes.

---

## 7. Add the number in the admin UI

1. Login to the app, go to **WhatsApp Numbers → Add new number**.
2. Fill in display name, phone number (E.164), Phone Number ID, Access Token, WABA ID.
3. The **Webhook Verify Token** is auto-generated. Copy it.
4. Click **Add number**.
5. Hit **Test** in the row to verify the credentials.

---

## 8. Subscribe the webhook

Back in the Meta dashboard → **WhatsApp → Configuration → Webhook**:

- **Callback URL**: `https://<your-project>.supabase.co/functions/v1/whatsapp-webhook`
- **Verify token**: the value shown in the modal (you copied it above)
- Click **Verify and save**.
- Subscribe to the **`messages`** field.

Meta will hit your webhook with `hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`. The function looks the token up in `whatsapp_numbers.webhook_verify_token` and returns the challenge if it matches.

---

## 9. Send a test message

From the same WhatsApp account that owns the test number, message your business number. Within seconds you should see:

- A new conversation appear in the inbox (realtime).
- An unread badge.
- A 24-hour countdown.

Reply from the inbox. The message should appear instantly with `✓` (pending) → `✓✓` (sent) → `✓✓` (delivered) → blue `✓✓` (read) as Meta sends back status updates.

---

## 10. Sync templates

Once you've created any approved templates in WhatsApp Manager:

- Go to **Templates** in the admin app.
- Pick a number from the dropdown.
- Click **Refresh from Meta** — they'll be pulled in and cached.

These show in the **Send template** picker inside the inbox when the 24-hour window is closed.

---

## Troubleshooting

| Symptom                                                       | Fix                                                                                                |
|---------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| Webhook verification fails (Meta says "challenge mismatch")    | The verify token in Meta doesn't match the one stored in `whatsapp_numbers`. Re-copy from the modal. |
| `403 Window expired` when sending                              | Use the template selector — the 24h customer-service window has closed.                            |
| Inbound messages don't appear                                  | Check `supabase functions logs whatsapp-webhook --tail` and confirm `messages` field is subscribed. |
| `Invalid OAuth token`                                          | Token is short-lived. Generate a System User permanent token in Meta and edit the number.          |
| Status icons stuck on `✓` (sent), never advance                | Webhook isn't receiving status updates — verify the subscription.                                  |
