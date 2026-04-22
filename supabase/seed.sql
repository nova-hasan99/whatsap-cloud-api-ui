-- =============================================================
-- Seed: default admin row in `public.admins`.
--
-- IMPORTANT: This only seeds the *profile* row. The actual auth
-- user must be created in Supabase Auth (Authentication → Users →
-- Add user) with the same email and the password "123456".
--
--   email:    lattice.hasan.dev@gmail.com
--   password: 123456
--
-- The application matches the auth user to this row by email.
-- =============================================================

insert into public.admins (email, password_hash, full_name)
values ('lattice.hasan.dev@gmail.com', 'managed-by-supabase-auth', 'Hasan')
on conflict (email) do nothing;
