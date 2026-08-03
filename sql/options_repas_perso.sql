-- Permettre aux utilisateurs de créer leurs propres repas types
alter table options_repas add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table options_repas add column if not exists objectif_cible text default 'tous';

-- Policy pour que chaque user puisse créer/modifier/supprimer ses repas types
create policy if not exists "user options_repas perso" on options_repas for all
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());
