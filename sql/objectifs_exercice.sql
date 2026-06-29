-- Objectifs de progression par exercice
-- A lancer dans Supabase > SQL Editor

create table if not exists objectifs_exercice (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  exercice_nom text not null,
  poids_cible_kg numeric not null,
  date_cible date not null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(user_id, exercice_nom)
);
alter table objectifs_exercice enable row level security;
create policy if not exists "user objectifs_exercice" on objectifs_exercice for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
