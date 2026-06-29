-- Ajout de la quantité en grammes dans repas
-- Pour recalculer les macros selon la portion réelle
alter table repas add column if not exists quantite_g numeric default null;
