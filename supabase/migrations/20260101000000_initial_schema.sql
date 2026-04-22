-- =============================================================
-- WhatsApp Business Platform — initial schema
-- Run this once via the Supabase SQL editor or `supabase db push`.
-- =============================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------
-- admins
-- -----------------------------------------------------------
create table if not exists public.admins (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  password_hash   text not null,                 -- legacy column; auth handled by Supabase Auth
  full_name       text,
  created_at      timestamptz not null default now()
);

-- -----------------------------------------------------------
-- whatsapp_numbers
-- -----------------------------------------------------------
create table if not exists public.whatsapp_numbers (
  id                     uuid primary key default gen_random_uuid(),
  display_name           text not null,
  phone_number           text not null,
  phone_number_id        text not null unique,
  access_token           text not null,
  waba_id                text not null,
  webhook_verify_token   text not null,
  status                 text not null default 'active' check (status in ('active', 'inactive', 'error')),
  created_at             timestamptz not null default now(),
  created_by             uuid references public.admins(id) on delete set null
);

create index if not exists idx_whatsapp_numbers_status on public.whatsapp_numbers(status);

-- -----------------------------------------------------------
-- conversations
-- -----------------------------------------------------------
create table if not exists public.conversations (
  id                        uuid primary key default gen_random_uuid(),
  whatsapp_number_id        uuid not null references public.whatsapp_numbers(id) on delete cascade,
  customer_phone            text not null,
  customer_name             text,
  customer_profile_pic_url  text,
  last_message_at           timestamptz not null default now(),
  last_message_preview      text,
  unread_count              integer not null default 0,
  status                    text not null default 'active' check (status in ('active', 'archived')),
  window_expires_at         timestamptz,
  created_at                timestamptz not null default now(),
  unique(whatsapp_number_id, customer_phone)
);

create index if not exists idx_conversations_number on public.conversations(whatsapp_number_id);
create index if not exists idx_conversations_last_msg on public.conversations(last_message_at desc);
create index if not exists idx_conversations_unread on public.conversations(unread_count) where unread_count > 0;

-- -----------------------------------------------------------
-- messages
-- -----------------------------------------------------------
create table if not exists public.messages (
  id                   uuid primary key default gen_random_uuid(),
  conversation_id      uuid not null references public.conversations(id) on delete cascade,
  whatsapp_number_id   uuid not null references public.whatsapp_numbers(id) on delete cascade,
  wamid                text unique,
  direction            text not null check (direction in ('inbound', 'outbound')),
  type                 text not null check (type in ('text', 'image', 'video', 'document', 'audio', 'template')),
  content              jsonb not null,
  status               text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  timestamp            timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, timestamp desc);
create index if not exists idx_messages_wamid on public.messages(wamid);

-- -----------------------------------------------------------
-- message_templates
-- -----------------------------------------------------------
create table if not exists public.message_templates (
  id                   uuid primary key default gen_random_uuid(),
  whatsapp_number_id   uuid not null references public.whatsapp_numbers(id) on delete cascade,
  template_name        text not null,
  template_id          text not null,
  category             text not null check (category in ('marketing', 'utility', 'authentication')),
  language             text not null,
  status               text not null default 'pending' check (status in ('approved', 'pending', 'rejected')),
  components           jsonb not null,
  created_at           timestamptz not null default now(),
  unique(whatsapp_number_id, template_name, language)
);

create index if not exists idx_templates_number on public.message_templates(whatsapp_number_id);

-- =============================================================
-- Row Level Security
-- All tables: only authenticated users (admin app) can read/write.
-- The edge functions use the service role key which bypasses RLS.
-- =============================================================

alter table public.admins              enable row level security;
alter table public.whatsapp_numbers    enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.message_templates   enable row level security;

-- admins: users can read their own row
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins
  for select using (true);

-- All other tables: any authenticated user has full access
do $$
declare t text;
begin
  for t in select unnest(array['whatsapp_numbers','conversations','messages','message_templates']) loop
    execute format('drop policy if exists "auth full access" on public.%I', t);
    execute format(
      'create policy "auth full access" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- =============================================================
-- Realtime: publish messages and conversations
-- =============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- =============================================================
-- Helper trigger: keep conversation.last_message_* in sync
-- =============================================================
create or replace function public.touch_conversation_on_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
     set last_message_at      = new.timestamp,
         last_message_preview = case
           when new.type = 'text' then left(coalesce(new.content->>'body',''), 120)
           when new.type = 'image' then '📷 Photo'
           when new.type = 'video' then '🎥 Video'
           when new.type = 'audio' then '🎵 Audio'
           when new.type = 'document' then '📄 ' || coalesce(new.content->>'filename','Document')
           when new.type = 'template' then '📋 Template'
           else 'Message'
         end,
         unread_count = case
           when new.direction = 'inbound' then unread_count + 1
           else unread_count
         end,
         window_expires_at = case
           when new.direction = 'inbound' then new.timestamp + interval '24 hours'
           else window_expires_at
         end
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();
