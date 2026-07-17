-- ============================================
-- TABLE DOULEURS / BLESSURES
-- À lancer dans Supabase > SQL Editor
-- ============================================

create table if not exists douleurs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  seance_duree_id bigint references seances_duree(id) on delete set null,
  date_seance date not null,
  zone text not null, -- epaule, coude, poignet, dos_haut, dos_bas, hanche, genou, cheville, autre
  intensite text not null, -- legere, moderee, forte
  note text,
  created_at timestamptz default now()
);

alter table douleurs enable row level security;
create policy "user douleurs" on douleurs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_douleurs_user_date on douleurs(user_id, date_seance desc);
