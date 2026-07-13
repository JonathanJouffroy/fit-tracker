-- ============================================
-- PROGRAMMES POIDS DU CORPS
-- À lancer dans Supabase > SQL Editor
-- ============================================

-- Programme 1 : Poids du corps débutant — 3 jours
with prog as (
  insert into programmes (nom, description, est_fixe)
  values (
    'Poids du corps — Débutant',
    'Programme 3 jours sans matériel. Idéal pour débuter avec le poids du corps. Lun / Mer / Ven.',
    true
  )
  returning id
)
insert into programme_exercices (programme_id, jour_id, nom, series, repetitions, repos_secondes, ordre)
select prog.id, j.id, exo.nom, exo.series, exo.reps, exo.repos, exo.ordre
from prog, (values
  -- Lundi — Haut du corps
  (1, 'Pompes', 3, 10, 60, 1),
  (1, 'Tractions australiennes', 3, 10, 60, 2),
  (1, 'Dips sur chaise', 3, 10, 60, 3),
  (1, 'Gainage', 3, 30, 45, 4),
  -- Mercredi — Bas du corps
  (3, 'Squats', 3, 15, 60, 1),
  (3, 'Fentes avant', 3, 12, 60, 2),
  (3, 'Pont fessier', 3, 15, 45, 3),
  (3, 'Mollets debout', 3, 20, 45, 4),
  -- Vendredi — Full body
  (5, 'Burpees', 3, 10, 75, 1),
  (5, 'Pompes inclinées', 3, 10, 60, 2),
  (5, 'Squat sauté', 3, 10, 60, 3),
  (5, 'Crunchs', 3, 15, 45, 4),
  (5, 'Superman', 3, 12, 45, 5)
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;


-- Programme 2 : Poids du corps intermédiaire — 4 jours
with prog as (
  insert into programmes (nom, description, est_fixe)
  values (
    'Poids du corps — Intermédiaire',
    'Programme 4 jours Upper/Lower sans matériel. Pour progresser avec le poids du corps.',
    true
  )
  returning id
)
insert into programme_exercices (programme_id, jour_id, nom, series, repetitions, repos_secondes, ordre)
select prog.id, j.id, exo.nom, exo.series, exo.reps, exo.repos, exo.ordre
from prog, (values
  -- Lundi — Haut poussée
  (1, 'Pompes classiques', 4, 15, 60, 1),
  (1, 'Pompes diamant', 3, 10, 60, 2),
  (1, 'Dips sur chaise', 4, 12, 60, 3),
  (1, 'Pike push-up', 3, 10, 60, 4),
  (1, 'Gainage', 3, 45, 45, 5),
  -- Mardi — Bas
  (2, 'Squats bulgares', 4, 12, 75, 1),
  (2, 'Fentes marchées', 3, 12, 60, 2),
  (2, 'Pont fessier unilatéral', 3, 12, 60, 3),
  (2, 'Squat sauté', 3, 10, 60, 4),
  (2, 'Mollets unilatéraux', 3, 20, 45, 5),
  -- Jeudi — Haut tirage
  (4, 'Tractions australiennes', 4, 12, 75, 1),
  (4, 'Tractions prises larges', 3, 6, 90, 2),
  (4, 'Rowing sur table', 3, 12, 60, 3),
  (4, 'Crunchs vélo', 3, 20, 45, 4),
  (4, 'Planche latérale', 3, 30, 45, 5),
  -- Vendredi — Bas explosif
  (5, 'Squat jump', 4, 10, 60, 1),
  (5, 'Fentes sautées', 3, 10, 60, 2),
  (5, 'Nordic curl', 3, 6, 90, 3),
  (5, 'Glute bridge', 4, 15, 45, 4),
  (5, 'Gainage dynamique', 3, 30, 45, 5)
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;


-- Programme 3 : Calisthenics — 5 jours
with prog as (
  insert into programmes (nom, description, est_fixe)
  values (
    'Calisthenics — Avancé',
    'Programme 5 jours axé sur la maîtrise du corps : progressions vers tractions, dips, L-sit et muscle-up.',
    true
  )
  returning id
)
insert into programme_exercices (programme_id, jour_id, nom, series, repetitions, repos_secondes, ordre)
select prog.id, j.id, exo.nom, exo.series, exo.reps, exo.repos, exo.ordre
from prog, (values
  -- Lundi — Push (poussée)
  (1, 'Pompes archer', 4, 8, 75, 1),
  (1, 'Dips', 4, 10, 75, 2),
  (1, 'Pike push-up', 4, 10, 60, 3),
  (1, 'Pompes déclinées', 3, 12, 60, 4),
  (1, 'Gainage', 3, 60, 45, 5),
  -- Mardi — Pull (tirage)
  (2, 'Tractions pronation', 4, 8, 90, 1),
  (2, 'Tractions supination', 4, 8, 90, 2),
  (2, 'Tractions australiennes lentes', 3, 10, 75, 3),
  (2, 'Fascia rowing', 3, 12, 60, 4),
  (2, 'L-sit isométrique', 3, 15, 60, 5),
  -- Mercredi — Jambes
  (3, 'Pistol squat progressif', 4, 6, 90, 1),
  (3, 'Fentes bulgares', 4, 10, 75, 2),
  (3, 'Nordic curl', 3, 5, 90, 3),
  (3, 'Squat jump', 3, 10, 60, 4),
  (3, 'Mollets unilatéraux', 4, 20, 45, 5),
  -- Jeudi — Core & Gainage
  (4, 'Dragon flag', 3, 6, 90, 1),
  (4, 'Hollow body', 3, 30, 60, 2),
  (4, 'Relevé de jambes suspendu', 4, 10, 60, 3),
  (4, 'Planche latérale', 3, 45, 45, 4),
  (4, 'Ab wheel', 3, 10, 60, 5),
  -- Vendredi — Full body explosif
  (5, 'Muscle-up progressif', 3, 5, 120, 1),
  (5, 'Burpees avec traction', 3, 8, 75, 2),
  (5, 'Pompes plyométriques', 3, 10, 60, 3),
  (5, 'Squat jump', 3, 10, 60, 4),
  (5, 'Gainage dynamique', 3, 45, 45, 5)
) as exo(jour_num, nom, series, reps, repos, ordre)
join jours j on j.numero = exo.jour_num;
