-- 桜の文法 — Inscriptions sans e-mail de confirmation
-- À lancer UNE fois dans Supabase → SQL Editor, APRÈS avoir désactivé « Confirm email »
-- (Authentication → Sign In / Providers → Email → Confirm email : OFF).
--
-- Valide les comptes créés pendant que la confirmation était encore demandée
-- (ceux de tes amis bloqués par la limite d'e-mails) : ils peuvent se connecter tout de suite.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;
