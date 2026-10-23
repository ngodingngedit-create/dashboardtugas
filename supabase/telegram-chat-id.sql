-- =============================================================
-- Telegram Chat ID per pengguna (integrasi n8n)
-- Jalankan file ini di Supabase SQL Editor.
-- Policy UPDATE profiles milik sendiri yang sudah ada tetap berlaku.
-- =============================================================

alter table public.profiles
  add column if not exists telegram_chat_id text
  check (telegram_chat_id is null or telegram_chat_id ~ '^-?[0-9]{1,20}$');
