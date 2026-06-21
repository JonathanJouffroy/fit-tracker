-- ============================================
-- AJOUT : OPTIONS DE REPAS PRÉDÉFINIES
-- A lancer dans Supabase > SQL Editor (en plus du schema.sql initial)
-- ============================================

-- Modèles de repas réutilisables (ex: "Bowl Skyr & Flocons d'avoine")
create table options_repas (
  id bigint generated always as identity primary key,
  type text check (type in ('petit-dejeuner', 'dejeuner', 'diner', 'collation')) not null,
  nom text not null,
  profil text, -- ex: "Riche en glucides complexes, très faible en lipides"
  poids_total_g int,
  kcal int not null,
  proteines_g numeric not null,
  glucides_g numeric not null,
  lipides_g numeric not null,
  ordre int default 0
);

-- Ingrédients détaillés de chaque option
create table options_repas_ingredients (
  id bigint generated always as identity primary key,
  option_repas_id bigint references options_repas(id) on delete cascade,
  nom text not null,
  quantite text, -- ex: "140g" ou "3 gros (~180g)"
  kcal int,
  proteines_g numeric,
  glucides_g numeric,
  lipides_g numeric,
  ordre int default 0
);

-- Lien entre un repas du jour (table "repas") et l'option choisie, pour garder une trace
alter table repas add column option_repas_id bigint references options_repas(id);

create index idx_options_repas_type on options_repas(type);
create index idx_options_ingredients_option on options_repas_ingredients(option_repas_id);

alter table options_repas enable row level security;
alter table options_repas_ingredients enable row level security;
create policy "public access options_repas" on options_repas for all using (true) with check (true);
create policy "public access options_repas_ingredients" on options_repas_ingredients for all using (true) with check (true);

-- ============================================
-- DONNÉES : PETIT-DÉJEUNER
-- ============================================

-- Option 1 : Bowl Skyr & Flocons d'avoine
with o1 as (
  insert into options_repas (type, nom, profil, poids_total_g, kcal, proteines_g, glucides_g, lipides_g, ordre)
  values ('petit-dejeuner', 'Bowl Skyr & Flocons d''avoine', 'Riche en glucides complexes, très faible en lipides', 340, 315, 21, 44, 3, 1)
  returning id
)
insert into options_repas_ingredients (option_repas_id, nom, quantite, kcal, proteines_g, glucides_g, lipides_g, ordre)
select id, 'Skyr Nature', '140g', 80, 14, 5, 0, 1 from o1
union all select id, 'Flocons d''avoine', '40g', 150, 5, 25, 3, 2 from o1
union all select id, 'Fraises ou Myrtilles', '150g', 55, 1, 11, 0, 3 from o1
union all select id, 'Miel', '10g (1 c. à café)', 30, 0, 8, 0, 4 from o1;

-- Option 2 : Le Salé Énergie (Œufs & Pain de seigle)
with o2 as (
  insert into options_repas (type, nom, profil, poids_total_g, kcal, proteines_g, glucides_g, lipides_g, ordre)
  values ('petit-dejeuner', 'Le Salé Énergie (Œufs & Pain de seigle)', 'Riche en protéines et bons lipides, idéal pour la satiété', 245, 395, 27, 26, 19, 2)
  returning id
)
insert into options_repas_ingredients (option_repas_id, nom, quantite, kcal, proteines_g, glucides_g, lipides_g, ordre)
select id, 'Œufs entiers', '3 gros (~180g)', 225, 20, 1, 15, 1 from o2
union all select id, 'Huile d''olive (cuisson)', '5g (1 c. à café)', 45, 0, 0, 5, 2 from o2
union all select id, 'Pain de seigle', '60g (2 tranches)', 125, 7, 25, 1, 3 from o2;

-- Option 3 : Les Pancakes Protéinés
with o3 as (
  insert into options_repas (type, nom, profil, poids_total_g, kcal, proteines_g, glucides_g, lipides_g, ordre)
  values ('petit-dejeuner', 'Les Pancakes Protéinés', 'Grosse assiette (volume), le plus riche en protéines', 385, 360, 28, 44, 6, 3)
  returning id
)
insert into options_repas_ingredients (option_repas_id, nom, quantite, kcal, proteines_g, glucides_g, lipides_g, ordre)
select id, 'Œuf entier', '1 œuf (~60g)', 75, 7, 0, 5, 1 from o3
union all select id, 'Blanc d''œuf', '1 blanc (~35g)', 15, 3, 0, 0, 2 from o3
union all select id, 'Skyr Nature (dans la pâte)', '100g', 57, 10, 4, 0, 3 from o3
union all select id, 'Farine complète (ou avoine)', '40g', 140, 5, 27, 1, 4 from o3
union all select id, 'Fraises ou Myrtilles (topping)', '150g', 55, 1, 11, 0, 5 from o3;
