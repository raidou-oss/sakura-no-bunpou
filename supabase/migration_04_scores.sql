-- 桜の文法 — migration 4 : scores des jeux visibles sur les profils.
-- À coller dans Supabase : SQL Editor → New query → Run. Sans danger si on la relance.

alter table public.profiles add column if not exists scores jsonb not null default '{}'::jsonb;
