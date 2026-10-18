-- 桜の文法 — migration 2 : connexion par identifiant (pseudo) et pseudos en japonais.
-- À coller dans Supabase : SQL Editor → New query → Run. Sans danger si on la relance.

create extension if not exists pgcrypto with schema extensions;

-- Pseudos de 2 à 20 caractères (由紀, ゆき, ユキ, yuki_fr…), sans espaces ni caractères spéciaux dangereux
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check
  check (char_length(username) between 2 and 20 and username !~ '[[:space:]@<>"''`/\\]');
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- Création du profil à l'inscription : on garde le pseudo tel quel (japonais compris)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 0;
begin
  base := regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[[:space:]@<>"''`/\\]', '', 'g');
  base := left(base, 18);
  if char_length(base) < 2 then base := 'eleve' || substr(md5(new.id::text), 1, 4); end if;
  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    n := n + 1; candidate := base || n;
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end $$;

-- Le pseudo est-il libre ? (vérifié avant l'inscription)
create or replace function public.username_available(p_username text) returns boolean
language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- Connexion par pseudo : renvoie l'e-mail du compte UNIQUEMENT si le mot de passe est correct
-- (personne ne peut récupérer l'e-mail d'un autre élève).
create or replace function public.login_email(p_login text, p_password text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare u record;
begin
  select au.email, au.encrypted_password into u
  from public.profiles p join auth.users au on au.id = p.id
  where lower(p.username) = lower(trim(p_login));
  if u.email is null or u.encrypted_password is null
     or extensions.crypt(p_password, u.encrypted_password) <> u.encrypted_password then
    perform pg_sleep(0.4); -- freine les essais en série
    return null;
  end if;
  return u.email;
end $$;
revoke all on function public.login_email(text, text) from public;
grant execute on function public.login_email(text, text) to anon, authenticated;
