-- 桜の文法 — migration 3 : jauges sur les profils + réactions en temps réel.
-- À coller dans Supabase : SQL Editor → New query → Run. Sans danger si on la relance.

alter table public.profiles add column if not exists grammar_pct real not null default 0;
alter table public.profiles add column if not exists vocab_pct real not null default 0;

-- Diffuser les nouvelles réactions en direct (notification instantanée chez le destinataire)
do $$ begin
  alter publication supabase_realtime add table public.reactions;
exception when duplicate_object then null; end $$;
