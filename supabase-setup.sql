-- ============================================
-- FAVANIM — Schéma Supabase
-- À exécuter dans le dashboard Supabase : SQL Editor > New query > Run
-- ============================================

-- ===== Table profils (liée aux comptes auth) =====
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  profile_photo text,                       -- data URL base64 (200x200 jpeg)
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profils visibles par tous"
  on public.profiles for select
  using (true);

create policy "Créer son propre profil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Modifier son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Table favoris =====
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  anime_id integer not null,
  title text not null,
  title_english text,
  image text,
  type text,
  episodes integer,
  score numeric,
  user_rating numeric not null default 0,
  user_comment text,
  added_at timestamptz not null default now(),
  primary key (user_id, anime_id)
);

alter table public.favorites enable row level security;

create policy "Voir ses propres favoris"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Ajouter un favori"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Modifier son favori"
  on public.favorites for update
  using (auth.uid() = user_id);

create policy "Supprimer son favori"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ===== Statistiques communautaires =====
-- Lecture publique ; écrites uniquement par trigger (security definer),
-- jamais directement par les clients.
create table if not exists public.community_stats (
  anime_id integer primary key,
  count integer not null default 0,
  total_rating numeric not null default 0,
  average_rating numeric not null default 0,
  last_updated timestamptz not null default now()
);

alter table public.community_stats enable row level security;

create policy "Stats visibles par tous"
  on public.community_stats for select
  using (true);

create or replace function public.update_community_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.community_stats (anime_id, count, total_rating, average_rating, last_updated)
  values (new.anime_id, 1, new.user_rating, new.user_rating, now())
  on conflict (anime_id) do update set
    count = community_stats.count + 1,
    total_rating = community_stats.total_rating + new.user_rating,
    average_rating = (community_stats.total_rating + new.user_rating) / (community_stats.count + 1),
    last_updated = now();
  return new;
end;
$$;

drop trigger if exists on_favorite_added on public.favorites;
create trigger on_favorite_added
  after insert on public.favorites
  for each row execute function public.update_community_stats();
