-- ============================================
-- PROGRAMMES POIDS DU CORPS — ZÉRO MATÉRIEL
-- À lancer dans Supabase > SQL Editor
-- ============================================

-- Supprimer les anciens programmes pour éviter les doublons
delete from programmes where nom in (
  'Poids du corps — Débutant',
  'Poids du corps — Intermédiaire',
  'Calisthenics — Avancé',
  'Zéro matériel — Débutant',
  'Zéro matériel — Intermédiaire',
  'Zéro matériel — Avancé'
);

-- ============================================
-- Programme 1 : Zéro matériel — Débutant (3 jours)
-- Lun / Mer / Ven
-- Isométriques en secondes (Gainage, Planche)
-- ============================================
with prog as (
  insert into programmes (nom, description, est_fixe)
  values (
    'Zéro matériel — Débutant',
    'Programme 3 jours sans aucun équipement. Lun/Mer/Ven. Idéal pour débuter à la maison.',
    true
  )
  returning id
)
insert into programme_exercices (programme_id, jour_id, nom, series, repetitions, repos_secondes, ordre)
select prog.id, j.id, exo.nom, exo.series, exo.reps, exo.repos, exo.ordre
from prog, (values
  -- Lundi — Haut du corps
  (1, 'Pompes classiques',   3, 8,  60, 1),  -- reps
  (1, 'Pompes diamant',      3, 8,  60, 2),  -- reps
  (1, 'Pike push-up',        3, 8,  60, 3),  -- reps
  (1, 'Superman',            3, 12, 45, 4),  -- reps
  (1, 'Gainage',             3, 30, 45, 5),  -- secondes
  -- Mercredi — Bas du corps
  (3, 'Squat',               3, 15, 60, 1),  -- reps
  (3, 'Fentes avant',        3, 10, 60, 2),  -- reps (par jambe)
  (3, 'Pont fessier',        3, 15, 45, 3),  -- reps
  (3, 'Mollets debout',      3, 20, 45, 4),  -- reps
  (3, 'Crunchs',             3, 15, 45, 5),  -- reps
  -- Vendredi — Full body
  (5, 'Burpees',             3, 8,  75, 1),  -- reps
  (5, 'Pompes inclinées',    3, 10, 60, 2),  -- reps
  (5, 'Squat sauté',         3, 10, 60, 3),  -- reps
  (5, 'Superman',            3, 12, 45, 4),  -- reps
  (5, 'Planche',             3, 30, 45, 5)   -- secondes
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;


-- ============================================
-- Programme 2 : Zéro matériel — Intermédiaire (4 jours)
-- Lun / Mar / Jeu / Ven
-- ============================================
with prog as (
  insert into programmes (nom, description, est_fixe)
  values (
    'Zéro matériel — Intermédiaire',
    'Programme 4 jours sans aucun équipement. Haut/Bas alternés. Progression sur pompes et gainage.',
    true
  )
  returning id
)
insert into programme_exercices (programme_id, jour_id, nom, series, repetitions, repos_secondes, ordre)
select prog.id, j.id, exo.nom, exo.series, exo.reps, exo.repos, exo.ordre
from prog, (values
  -- Lundi — Haut push + dos sol
  (1, 'Pompes classiques',        4, 12, 60, 1),  -- reps
  (1, 'Pompes diamant',           3, 10, 60, 2),  -- reps
  (1, 'Pompes déclinées',         3, 10, 60, 3),  -- reps
  (1, 'Superman',                 4, 15, 45, 4),  -- reps
  (1, 'Reverse snow angel',       3, 12, 45, 5),  -- reps
  (1, 'Gainage',                  3, 40, 45, 6),  -- secondes
  -- Mardi — Bas
  (2, 'Squat bulgare',            4, 10, 75, 1),  -- reps (par jambe)
  (2, 'Fentes marchées',          3, 12, 60, 2),  -- reps (par jambe)
  (2, 'Pont fessier unilatéral',  3, 12, 60, 3),  -- reps (par jambe)
  (2, 'Squat sauté',              3, 10, 60, 4),  -- reps
  (2, 'Mollets unilatéraux',      3, 20, 45, 5),  -- reps (par jambe)
  -- Jeudi — Haut push + gainage avancé
  (4, 'Pompes archer',            4, 8,  75, 1),  -- reps (par côté)
  (4, 'Pike push-up',             4, 10, 60, 2),  -- reps
  (4, 'Pompes plyométriques',     3, 8,  75, 3),  -- reps
  (4, 'Prone Y-T-W',             3, 12, 45, 4),  -- reps
  (4, 'Planche latérale',         3, 30, 45, 5),  -- secondes (par côté)
  (4, 'Crunchs vélo',             3, 20, 45, 6),  -- reps
  -- Vendredi — Bas explosif
  (5, 'Squat jump',               4, 10, 60, 1),  -- reps
  (5, 'Fentes sautées',           3, 10, 60, 2),  -- reps
  (5, 'Good morning',             3, 15, 60, 3),  -- reps
  (5, 'Glute bridge',             4, 15, 45, 4),  -- reps
  (5, 'Gainage dynamique',        3, 30, 45, 5)   -- secondes
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;


-- ============================================
-- Programme 3 : Zéro matériel — Avancé (5 jours)
-- Lun / Mar / Mer / Jeu / Ven
-- ============================================
with prog as (
  insert into programmes (nom, description, est_fixe)
  values (
    'Zéro matériel — Avancé',
    'Programme 5 jours intensif sans équipement. Pompes archer, pistol squat, dragon flag, hollow body.',
    true
  )
  returning id
)
insert into programme_exercices (programme_id, jour_id, nom, series, repetitions, repos_secondes, ordre)
select prog.id, j.id, exo.nom, exo.series, exo.reps, exo.repos, exo.ordre
from prog, (values
  -- Lundi — Push intensif
  (1, 'Pompes archer',           4, 10, 75, 1),  -- reps (par côté)
  (1, 'Pompes diamant',          4, 12, 60, 2),  -- reps
  (1, 'Pike push-up',            4, 10, 60, 3),  -- reps
  (1, 'Pompes plyométriques',    3, 10, 75, 4),  -- reps
  (1, 'Gainage',                 3, 60, 45, 5),  -- secondes
  -- Mardi — Jambes force
  (2, 'Pistol squat progressif', 4, 6,  90, 1),  -- reps (par jambe)
  (2, 'Squat bulgare',           4, 12, 75, 2),  -- reps (par jambe)
  (2, 'Fentes sautées',          3, 10, 60, 3),  -- reps
  (2, 'Good morning',            3, 15, 60, 4),  -- reps
  (2, 'Mollets unilatéraux',     4, 20, 45, 5),  -- reps (par jambe)
  -- Mercredi — Dos & posture (chaîne postérieure)
  (3, 'Superman',                4, 20, 45, 1),  -- reps
  (3, 'Reverse snow angel',      4, 15, 45, 2),  -- reps
  (3, 'Prone Y-T-W',            4, 12, 45, 3),  -- reps
  (3, 'Good morning',            3, 15, 60, 4),  -- reps
  (3, 'Planche latérale',        3, 45, 45, 5),  -- secondes (par côté)
  -- Jeudi — Core avancé
  (4, 'Dragon flag progressif',  3, 5,  90, 1),  -- reps
  (4, 'Hollow body',             3, 30, 60, 2),  -- secondes
  (4, 'Relevé de jambes sol',    4, 12, 60, 3),  -- reps
  (4, 'Crunchs vélo',            3, 20, 45, 4),  -- reps
  (4, 'Planche',                 3, 60, 45, 5),  -- secondes
  -- Vendredi — Full body explosif
  (5, 'Burpees',                 4, 10, 75, 1),  -- reps
  (5, 'Pompes archer',           3, 8,  75, 2),  -- reps (par côté)
  (5, 'Squat jump',              3, 12, 60, 3),  -- reps
  (5, 'Pistol squat progressif', 3, 5,  90, 4),  -- reps (par jambe)
  (5, 'Gainage dynamique',       3, 45, 45, 5)   -- secondes
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;
