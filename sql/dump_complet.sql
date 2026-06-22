-- ============================================
-- FIT TRACKER — SCRIPT COMPLET v3
-- Auth multi-utilisateur + user_id sur toutes les tables
-- A lancer en une seule fois dans Supabase > SQL Editor
-- ============================================

drop table if exists seances_log cascade;
drop table if exists options_repas_ingredients cascade;
drop table if exists repas cascade;
drop table if exists options_repas cascade;
drop table if exists exercices cascade;
drop table if exists mesures cascade;
drop table if exists profil cascade;
drop table if exists jours cascade;

-- ============================================
-- TABLES
-- ============================================

create table jours (
  id bigint generated always as identity primary key,
  numero int not null unique check (numero between 1 and 7),
  nom text not null
);

insert into jours (numero, nom) values
  (1,'Lundi'),(2,'Mardi'),(3,'Mercredi'),
  (4,'Jeudi'),(5,'Vendredi'),(6,'Samedi'),(7,'Dimanche');

create table exercices (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  jour_id bigint references jours(id) on delete cascade,
  nom text not null,
  series int not null default 3,
  repetitions int not null default 10,
  repos_secondes int not null default 60,
  poids_charge_kg numeric default 0,
  ordre int default 0,
  created_at timestamp default now()
);

create table seances_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  exercice_id bigint references exercices(id) on delete cascade,
  date_seance date default current_date,
  serie_numero int not null,
  poids_kg numeric,
  repetitions_faites int,
  created_at timestamp default now()
);

create table options_repas (
  id bigint generated always as identity primary key,
  type text check (type in ('petit-dejeuner','dejeuner','diner','collation')) not null,
  nom text not null,
  profil text,
  poids_total_g int,
  kcal int not null,
  proteines_g numeric not null,
  glucides_g numeric not null,
  lipides_g numeric not null,
  note_preparation text,
  ordre int default 0
);

create table options_repas_ingredients (
  id bigint generated always as identity primary key,
  option_repas_id bigint references options_repas(id) on delete cascade,
  nom text not null,
  quantite text,
  kcal int,
  proteines_g numeric,
  glucides_g numeric,
  lipides_g numeric,
  ordre int default 0
);

create table repas (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nom text not null,
  type text check (type in ('petit-dejeuner','dejeuner','diner','collation')),
  date_repas date default current_date,
  fait boolean default false,
  option_repas_id bigint references options_repas(id),
  created_at timestamp default now()
);

create table mesures (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  poids_kg numeric not null,
  taille_cm numeric not null,
  date_mesure date default current_date,
  created_at timestamp default now()
);

create table profil (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  age int not null,
  sexe text check (sexe in ('homme','femme')) not null,
  niveau_activite text check (niveau_activite in (
    'sedentaire','leger','modere','intense','tres_intense'
  )) not null default 'modere',
  objectif text check (objectif in (
    'perte_poids','maintien','prise_masse'
  )) not null default 'maintien',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- ============================================
-- INDEX
-- ============================================
create index idx_exercices_jour on exercices(jour_id);
create index idx_exercices_user on exercices(user_id);
create index idx_repas_date on repas(date_repas);
create index idx_repas_user on repas(user_id);
create index idx_seances_log_exercice on seances_log(exercice_id);
create index idx_seances_log_user on seances_log(user_id);
create index idx_seances_log_date on seances_log(date_seance);
create index idx_mesures_user on mesures(user_id);
create index idx_profil_user on profil(user_id);
create index idx_options_repas_type on options_repas(type);
create index idx_options_ingredients_option on options_repas_ingredients(option_repas_id);

-- ============================================
-- RLS — Chaque utilisateur ne voit que ses données
-- ============================================
alter table jours enable row level security;
alter table exercices enable row level security;
alter table seances_log enable row level security;
alter table repas enable row level security;
alter table mesures enable row level security;
alter table profil enable row level security;
alter table options_repas enable row level security;
alter table options_repas_ingredients enable row level security;

-- jours : lecture publique (partagé entre tous)
create policy "lecture jours" on jours for select using (true);

-- options_repas : lecture publique (le catalogue est partagé)
create policy "lecture options_repas" on options_repas for select using (true);
create policy "lecture options_ingredients" on options_repas_ingredients for select using (true);

-- exercices : accès uniquement à ses propres données
create policy "user exercices" on exercices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- seances_log
create policy "user seances_log" on seances_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- repas
create policy "user repas" on repas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mesures
create policy "user mesures" on mesures for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- profil
create policy "user profil" on profil for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- DONNÉES : OPTIONS REPAS (catalogue partagé)
-- ============================================

-- PETIT-DÉJEUNER
with o1 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('petit-dejeuner','Bowl Skyr & Flocons d''avoine','Riche en glucides complexes, très faible en lipides',340,315,21,44,3,1) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Skyr Nature','140g',80,14,5,0,1 from o1 union all
select id,'Flocons d''avoine','40g',150,5,25,3,2 from o1 union all
select id,'Fraises ou Myrtilles','150g',55,1,11,0,3 from o1 union all
select id,'Miel','10g (1 c. à café)',30,0,8,0,4 from o1;

with o2 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('petit-dejeuner','Le Salé Énergie (Œufs & Pain de seigle)','Riche en protéines et bons lipides, idéal pour la satiété',245,395,27,26,19,2) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Œufs entiers','3 gros (~180g)',225,20,1,15,1 from o2 union all
select id,'Huile d''olive (cuisson)','5g (1 c. à café)',45,0,0,5,2 from o2 union all
select id,'Pain de seigle','60g (2 tranches)',125,7,25,1,3 from o2;

with o3 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('petit-dejeuner','Les Pancakes Protéinés','Grosse assiette (volume), le plus riche en protéines',385,360,28,44,6,3) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Œuf entier','1 œuf (~60g)',75,7,0,5,1 from o3 union all
select id,'Blanc d''œuf','1 blanc (~35g)',15,3,0,0,2 from o3 union all
select id,'Skyr Nature (dans la pâte)','100g',57,10,4,0,3 from o3 union all
select id,'Farine complète (ou avoine)','40g',140,5,27,1,4 from o3 union all
select id,'Fraises ou Myrtilles (topping)','150g',55,1,11,0,5 from o3;

-- DÉJEUNER
with l1 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('dejeuner','L''Assiette Poulet, Riz & Haricots verts','Un grand classique de la nutrition, riche en fibres digestes et micro-nutriments, très faible en lipides',550,505,38,64,8,1) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Filet de poulet grillé','150g',165,33,0,3.5,1 from l1 union all
select id,'Riz basmati (cuit)','200g',260,5,56,0.5,2 from l1 union all
select id,'Haricots verts (vapeur ou poêlés)','200g',45,0,8,0,3 from l1 union all
select id,'Huile d''olive (cuisson)','4g (1 c. à café rase)',35,0,0,4,4 from l1;

with l2 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('dejeuner','Le Rice Bowl Frais au Saumon','Une salade de riz froide façon "Poke", riche en Oméga-3 et très fraîche',470,585,31,62,22,2) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Pavé de saumon frais (cuit et refroidi)','120g',250,24,0,17,1 from l2 union all
select id,'Riz basmati (cuit et refroidi)','200g',260,5,56,0.5,2 from l2 union all
select id,'Dés de tomates & concombres','150g',30,2,6,0,3 from l2 union all
select id,'Huile d''olive (vinaigrette)','5g (1 c. à café)',45,0,0,5,4 from l2;

with l3 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('dejeuner','Le Duo Steaks 5% MG & Patate douce','Idéal pour couper la faim avec les fibres de la patate douce et des haricots verts',600,520,45,48,14,3) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Steaks hachés 5% MG','2 steaks (200g)',260,42,0,10,1 from l3 union all
select id,'Écrasé de patate douce (cuite)','200g',170,3,40,0,2 from l3 union all
select id,'Haricots verts à l''ail','200g',45,0,8,0,3 from l3 union all
select id,'Huile d''olive (cuisson/assaisonnement)','5g (1 c. à café)',45,0,0,5,4 from l3;

-- DÎNER
with d1 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('diner','La Salade Complète Pâtes, Thon & Œufs','Frais, rapide (sans cuisson si les œufs sont prêts), parfait pour les soirs d''été',550,490,39,51,14,1) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Pâtes complètes (cuites et refroidies)','150g',190,7,38,1,1 from d1 union all
select id,'Thon au naturel (égoutté)','1 boîte (~100g)',110,25,0,1,2 from d1 union all
select id,'Œufs durs','2 œufs entiers (~120g)',150,13,1,10,3 from d1 union all
select id,'Tomates cerises & Cornichons','150g',25,1,4,0,4 from d1 union all
select id,'Jus de citron & Filet d''huile d''olive','2g',15,0,0,2,5 from d1;

with d2 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('diner','Le Mexican Bowl au Poulet','Très digeste, équilibré, apporte des fibres et de la couleur dans l''assiette',580,485,39,56,11,2) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Émincé de poulet (cuit)','120g',135,26,0,3,1 from d2 union all
select id,'Riz basmati (cuit)','150g',195,4,42,0,2 from d2 union all
select id,'Mélange Maïs & Haricots rouges','100g',95,5,14,1,3 from d2 union all
select id,'Salade verte & Tomates','150g',20,1,3,0,4 from d2 union all
select id,'Huile d''olive (assaisonnement)','4g (1 c. à café rase)',40,0,0,4,5 from d2;

with d3 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,ordre)
  values ('diner','Pavé de Saumon et Poêlée de Légumes verts','Ultra-léger en glucides, idéal pour les jours sans entraînement ou pour un sommeil réparateur',470,415,27,24,23,3) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Pavé de saumon frais (au four ou à la poêle)','120g',250,24,0,17,1 from d3 union all
select id,'Riz basmati (cuit)','50g (petite portion)',65,1,14,0,2 from d3 union all
select id,'Haricots verts sautés à l''ail','200g',45,2,8,0,3 from d3 union all
select id,'Huile d''olive (cuisson)','6g',55,0,0,6,4 from d3;

-- COLLATION
with c1 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,note_preparation,ordre)
  values ('collation','Le Shaker Protéiné Express & Banane','Idéal post-entraînement ou pour un encas rapide. Simple, efficace et sans vaisselle',430,290,27,31,3,'Verser la whey et le lait d''amande directement dans un shaker manuel, secouer vigoureusement 15 secondes. Manger la banane entière à côté.',1) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Whey protéine (1 dose standard)','30g',110,24,2,1.5,1 from c1 union all
select id,'Lait d''amande sans sucres ajoutés','250g (ou ml)',30,1,0,1.5,2 from c1 union all
select id,'Banane mûre','1 moyenne (~150g)',150,2,29,0,3 from c1;

with c2 as (
  insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,note_preparation,ordre)
  values ('collation','L''Encas Minute Skyr, Choco & Amandes','Satiété durable grâce aux protéines lentes et aux bons lipides. Super gourmand',370,325,24,25,14,'Couper le chocolat au couteau et l''ajouter avec les amandes dans le pot de Skyr. Manger la pomme à côté.',2) returning id
)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Skyr Nature','200g',114,20,7,0,1 from c2 union all
select id,'Chocolat noir 85%','1 carré (~10g)',55,1,2,5,2 from c2 union all
select id,'Amandes','1 petite poignée (15g)',90,3,1,8,3 from c2 union all
select id,'Pomme','1 moyenne (~150g)',66,0,15,1,4 from c2;
