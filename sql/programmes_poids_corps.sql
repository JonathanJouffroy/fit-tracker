-- ============================================
-- PROGRAMMES POIDS DU CORPS — ZÉRO MATÉRIEL
-- À lancer dans Supabase > SQL Editor
-- ============================================

-- Supprimer les anciens programmes poids du corps si ils existent
delete from programmes where nom in (
  'Poids du corps — Débutant',
  'Poids du corps — Intermédiaire',
  'Calisthenics — Avancé'
);

-- Programme 1 : Zéro matériel — Débutant (3 jours)
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
  (1, 'Pompes classiques',        3, 8,  60, 1),
  (1, 'Pompes diamant',           3, 8,  60, 2),
  (1, 'Pike push-up',             3, 8,  60, 3),
  (1, 'Superman',                 3, 12, 45, 4),
  (1, 'Gainage',                  3, 20, 45, 5),
  -- Mercredi — Bas du corps
  (3, 'Squat',                    3, 15, 60, 1),
  (3, 'Fentes avant',             3, 10, 60, 2),
  (3, 'Pont fessier',             3, 15, 45, 3),
  (3, 'Mollets debout',           3, 20, 45, 4),
  (3, 'Crunchs',                  3, 15, 45, 5),
  -- Vendredi — Full body
  (5, 'Burpees',                  3, 8,  75, 1),
  (5, 'Pompes inclinées',         3, 10, 60, 2),
  (5, 'Squat sauté',              3, 10, 60, 3),
  (5, 'Prone Y-T-W',             3, 10, 45, 4),
  (5, 'Planche',                  3, 20, 45, 5)
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;


-- Programme 2 : Zéro matériel — Intermédiaire (4 jours)
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
  (1, 'Pompes classiques',        4, 12, 60, 1),
  (1, 'Pompes diamant',           3, 10, 60, 2),
  (1, 'Pompes déclinées',         3, 10, 60, 3),
  (1, 'Superman',                 4, 15, 45, 4),
  (1, 'Reverse snow angel',       3, 12, 45, 5),
  (1, 'Gainage',                  3, 40, 45, 6),
  -- Mardi — Bas
  (2, 'Squat bulgare',            4, 10, 75, 1),
  (2, 'Fentes marchées',          3, 12, 60, 2),
  (2, 'Pont fessier unilatéral',  3, 12, 60, 3),
  (2, 'Squat sauté',              3, 10, 60, 4),
  (2, 'Mollets unilatéraux',      3, 20, 45, 5),
  -- Jeudi — Haut push + gainage avancé
  (4, 'Pompes archer',            4, 8,  75, 1),
  (4, 'Pike push-up',             4, 10, 60, 2),
  (4, 'Pompes plyométriques',     3, 8,  75, 3),
  (4, 'Prone Y-T-W',             3, 12, 45, 4),
  (4, 'Planche latérale',         3, 30, 45, 5),
  (4, 'Crunchs vélo',             3, 20, 45, 6),
  -- Vendredi — Bas explosif
  (5, 'Squat jump',               4, 10, 60, 1),
  (5, 'Fentes sautées',           3, 10, 60, 2),
  (5, 'Good morning',             3, 15, 60, 3),
  (5, 'Glute bridge',             4, 15, 45, 4),
  (5, 'Gainage dynamique',        3, 30, 45, 5)
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;


-- Programme 3 : Zéro matériel — Avancé (5 jours)
with prog as (
  insert into programmes (nom, description, est_fixe)
  values (
    'Zéro matériel — Avancé',
    'Programme 5 jours intensif sans équipement. Progressions difficiles : pompes archer, pistol squat, dragon flag.',
    true
  )
  returning id
)
insert into programme_exercices (programme_id, jour_id, nom, series, repetitions, repos_secondes, ordre)
select prog.id, j.id, exo.nom, exo.series, exo.reps, exo.repos, exo.ordre
from prog, (values
  -- Lundi — Push intensif
  (1, 'Pompes archer',            4, 10, 75, 1),
  (1, 'Pompes diamant',           4, 12, 60, 2),
  (1, 'Pike push-up',             4, 10, 60, 3),
  (1, 'Pompes plyométriques',     3, 10, 75, 4),
  (1, 'Gainage',                  3, 60, 45, 5),
  -- Mardi — Jambes force
  (2, 'Pistol squat progressif',  4, 6,  90, 1),
  (2, 'Squat bulgare',            4, 12, 75, 2),
  (2, 'Fentes sautées',           3, 10, 60, 3),
  (2, 'Good morning',             3, 15, 60, 4),
  (2, 'Mollets unilatéraux',      4, 20, 45, 5),
  -- Mercredi — Dos & posture
  (3, 'Superman',                 4, 20, 45, 1),
  (3, 'Reverse snow angel',       4, 15, 45, 2),
  (3, 'Prone Y-T-W',             4, 12, 45, 3),
  (3, 'Good morning',             3, 15, 60, 4),
  (3, 'Gainage latéral',          3, 45, 45, 5),
  -- Jeudi — Core avancé
  (4, 'Dragon flag progressif',   3, 5,  90, 1),
  (4, 'Hollow body',              3, 30, 60, 2),
  (4, 'Relevé de jambes sol',     4, 12, 60, 3),
  (4, 'Crunchs vélo',             3, 20, 45, 4),
  (4, 'Ab wheel progressif',      3, 10, 60, 5),
  -- Vendredi — Full body explosif
  (5, 'Burpees',                  4, 10, 75, 1),
  (5, 'Pompes archer',            3, 8,  75, 2),
  (5, 'Squat jump',               3, 12, 60, 3),
  (5, 'Pistol squat progressif',  3, 5,  90, 4),
  (5, 'Gainage dynamique',        3, 45, 45, 5)
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;
