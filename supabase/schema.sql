-- 桜の文法 — schéma Supabase (comptes, profils, progression, réactions)
-- À coller une seule fois dans Supabase : SQL Editor → New query → Run.

-- 1. Profils publics -----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  bio text default '' check (char_length(bio) <= 160),
  avatar_url text,
  banner_url text,
  rank int not null default 0,        -- 0 = N5 … 4 = N1, 5 = N1 validé
  gauge real not null default 0,      -- avancement dans le rang (0 → 1)
  xp int not null default 0,
  streak int not null default 0,
  learned int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profils lisibles par tous" on public.profiles;
create policy "profils lisibles par tous" on public.profiles for select using (true);
drop policy if exists "chacun modifie son profil" on public.profiles;
create policy "chacun modifie son profil" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "chacun crée son profil" on public.profiles;
create policy "chacun crée son profil" on public.profiles for insert with check (auth.uid() = id);

-- Création automatique du profil à l'inscription (pseudo choisi dans le formulaire)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 0;
begin
  base := coalesce(nullif(regexp_replace(new.raw_user_meta_data->>'username', '[^A-Za-z0-9_\-\.ぁ-んァ-ン一-龯]', '', 'g'), ''), 'eleve');
  base := left(base, 16);
  if char_length(base) < 3 then base := base || '_' || substr(md5(new.id::text), 1, 3); end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1; candidate := base || n;
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 2. Progression privée (révisions, réglages, stats) ---------------------------------
create table if not exists public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
drop policy if exists "progression privée" on public.progress;
create policy "progression privée" on public.progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Réactions entre élèves (une réaction de chaque type par jour et par personne) ---
create table if not exists public.reactions (
  id bigint generated always as identity primary key,
  from_user uuid not null references public.profiles on delete cascade,
  to_user uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('sugoi', 'ganbatte', 'omedetou', 'issho', 'otsukare')),
  day date not null default current_date,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (from_user, to_user, kind, day),
  check (from_user <> to_user)
);
alter table public.reactions enable row level security;
drop policy if exists "réactions visibles des membres" on public.reactions;
create policy "réactions visibles des membres" on public.reactions for select to authenticated using (true);
drop policy if exists "envoyer en son nom" on public.reactions;
create policy "envoyer en son nom" on public.reactions for insert to authenticated with check (auth.uid() = from_user);
drop policy if exists "marquer comme vue" on public.reactions;
create policy "marquer comme vue" on public.reactions for update to authenticated using (auth.uid() = to_user) with check (auth.uid() = to_user);
create index if not exists reactions_to_idx on public.reactions (to_user, created_at desc);

-- 4. Stockage des photos de profil et bannières --------------------------------------
insert into storage.buckets (id, name, public) values ('profiles', 'profiles', true)
  on conflict (id) do update set public = true;
drop policy if exists "photos lisibles" on storage.objects;
create policy "photos lisibles" on storage.objects for select using (bucket_id = 'profiles');
drop policy if exists "dépôt dans son dossier" on storage.objects;
create policy "dépôt dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "remplacement dans son dossier" on storage.objects;
create policy "remplacement dans son dossier" on storage.objects for update to authenticated
  using (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "suppression dans son dossier" on storage.objects;
create policy "suppression dans son dossier" on storage.objects for delete to authenticated
  using (bucket_id = 'profiles' and (storage.foldername(name))[1] = auth.uid()::text);
