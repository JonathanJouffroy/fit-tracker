-- ============================================
-- SCHEMA FIT TRACKER
-- A lancer dans Supabase > SQL Editor
-- ============================================

-- Jours de la semaine (1 = Lundi ... 7 = Dimanche)
create table jours (
  id bigint generated always as identity primary key,
  numero int not null unique check (numero between 1 and 7),
  nom text not null
);

insert into jours (numero, nom) values
  (1, 'Lundi'), (2, 'Mardi'), (3, 'Mercredi'),
  (4, 'Jeudi'), (5, 'Vendredi'), (6, 'Samedi'), (7, 'Dimanche');

-- Exercices planifiés par jour
create table exercices (
  id bigint generated always as identity primary key,
  jour_id bigint references jours(id) on delete cascade,
  nom text not null,
  series int not null default 3,
  repetitions int not null default 10,
  repos_secondes int not null default 60, -- durée de repos spécifique à cet exercice
  ordre int default 0,
  created_at timestamp default now()
);

-- Historique des séances effectuées (pour suivre la progression)
create table seances_log (
  id bigint generated always as identity primary key,
  exercice_id bigint references exercices(id) on delete cascade,
  date_seance date default current_date,
  serie_numero int not null,
  poids_kg numeric,
  repetitions_faites int,
  created_at timestamp default now()
);

-- Repas du jour (liste simple)
create table repas (
  id bigint generated always as identity primary key,
  nom text not null,
  type text check (type in ('petit-dejeuner', 'dejeuner', 'diner', 'collation')),
  date_repas date default current_date,
  fait boolean default false,
  created_at timestamp default now()
);

-- Mesures IMC (historique poids/taille)
create table mesures (
  id bigint generated always as identity primary key,
  poids_kg numeric not null,
  taille_cm numeric not null,
  date_mesure date default current_date,
  created_at timestamp default now()
);

-- Index utiles
create index idx_exercices_jour on exercices(jour_id);
create index idx_repas_date on repas(date_repas);
create index idx_seances_log_exercice on seances_log(exercice_id);

-- RLS désactivé pour démarrer simple (à activer plus tard si tu ajoutes l'authentification)
alter table jours enable row level security;
alter table exercices enable row level security;
alter table seances_log enable row level security;
alter table repas enable row level security;
alter table mesures enable row level security;

create policy "public access jours" on jours for all using (true) with check (true);
create policy "public access exercices" on exercices for all using (true) with check (true);
create policy "public access seances_log" on seances_log for all using (true) with check (true);
create policy "public access repas" on repas for all using (true) with check (true);
create policy "public access mesures" on mesures for all using (true) with check (true);
