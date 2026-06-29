-- ============================================
-- AJOUT EXERCICES CARDIO
-- A lancer dans Supabase > SQL Editor
-- ============================================

-- Colonnes dans exercices
alter table exercices add column if not exists type_exercice text default 'muscu'
  check (type_exercice in ('muscu', 'cardio'));
alter table exercices add column if not exists activite_cardio text;

-- Colonnes dans programme_exercices
alter table programme_exercices add column if not exists type_exercice text default 'muscu'
  check (type_exercice in ('muscu', 'cardio'));
alter table programme_exercices add column if not exists activite_cardio text;

-- Colonnes dans seances_log pour les métriques cardio
alter table seances_log add column if not exists duree_minutes numeric;
alter table seances_log add column if not exists distance_m numeric;
alter table seances_log add column if not exists denivele_m int;
alter table seances_log add column if not exists nb_sauts int;
alter table seances_log add column if not exists note_cardio text;
