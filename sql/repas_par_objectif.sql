-- ============================================
-- REPAS PAR OBJECTIF
-- A lancer dans Supabase > SQL Editor
-- Ajoute des options adaptées à chaque objectif
-- ============================================

-- Mettre à jour les repas existants comme compatibles "tous"
update options_repas set objectif_cible = 'tous' where objectif_cible is null;

-- ============================================
-- PERTE DE POIDS — Faible en calories, riche en protéines et fibres
-- ============================================

-- Petit-déjeuner perte de poids
with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('petit-dejeuner','Blanc d''œuf & Légumes sautés','Très faible en calories, riche en protéines maigres. Idéal pour démarrer sans excès.',280,185,24,8,5,'perte_poids',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Blancs d''œufs','5 blancs (~175g)',90,19,1,0,1 from o union all
select id,'Épinards frais','100g',25,3,3,0,2 from o union all
select id,'Champignons émincés','100g',25,2,4,0,3 from o union all
select id,'Huile de coco (cuisson)','5g',45,0,0,5,4 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('petit-dejeuner','Porridge Protéiné Léger','Rassasiant, fibres lentes, sans sucres ajoutés.',300,245,20,28,5,'perte_poids',11) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Flocons d''avoine','40g',150,5,25,3,1 from o union all
select id,'Protéine de whey vanille','20g',75,15,2,1,2 from o union all
select id,'Eau ou lait d''amande','200ml',10,0,0,0,3 from o union all
select id,'Framboises fraîches','100g',35,1,6,0,4 from o union all
select id,'Cannelle','1 pincée',0,0,0,0,5 from o;

-- Déjeuner perte de poids
with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('dejeuner','Salade de Poulet & Quinoa','Repas complet faible en calories. Indice glycémique bas, très rassasiant.',450,380,35,32,8,'perte_poids',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Blanc de poulet grillé','130g',140,29,0,2,1 from o union all
select id,'Quinoa cuit','100g',120,4,21,2,2 from o union all
select id,'Concombre & tomates','150g',25,1,5,0,3 from o union all
select id,'Roquette','50g',10,1,1,0,4 from o union all
select id,'Jus de citron & vinaigre','15ml',15,0,3,0,5 from o union all
select id,'Huile d''olive','5g',45,0,0,5,6 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('dejeuner','Bowl Thon, Haricots & Légumes','Très haut en protéines, zéro matières grasses ajoutées.',400,310,38,22,5,'perte_poids',11) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Thon au naturel','150g',165,33,0,2,1 from o union all
select id,'Haricots blancs cuits','100g',95,6,16,0,2 from o union all
select id,'Poivrons & courgettes','150g',35,2,6,0,3 from o union all
select id,'Jus de citron','15ml',5,0,1,0,4 from o union all
select id,'Persil frais','5g',2,0,0,0,5 from o;

-- Dîner perte de poids
with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('diner','Cabillaud Vapeur & Légumes Verts','Ultra-léger pour le soir. Zéro glucides, idéal pour brûler les graisses la nuit.',380,245,38,10,5,'perte_poids',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Filet de cabillaud','200g',165,35,0,2,1 from o union all
select id,'Brocolis vapeur','200g',55,5,7,0,2 from o union all
select id,'Haricots verts','100g',25,2,4,0,3 from o union all
select id,'Citron & herbes fraîches','20g',5,0,1,0,4 from o union all
select id,'Huile d''olive','5g',45,0,0,5,5 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('diner','Soupe Protéinée Poulet & Légumes','Repas chaud rassasiant, faible densité calorique. Parfait pour les soirées.',500,220,28,15,4,'perte_poids',11) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Blanc de poulet effiloché','120g',130,26,0,2,1 from o union all
select id,'Carottes, poireaux, céleri','200g',55,2,10,0,2 from o union all
select id,'Bouillon de volaille','500ml',20,1,3,0,3 from o union all
select id,'Herbes de Provence','5g',5,0,0,0,4 from o;

-- Collation perte de poids
with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('collation','Skyr & Fruits Rouges','Encas ultra-protéiné, faible en sucres. Combat les fringales efficacement.',250,130,18,12,0,'perte_poids',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Skyr Nature 0%','150g',85,15,5,0,1 from o union all
select id,'Framboises & myrtilles','100g',45,1,9,0,2 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('collation','Œuf dur & Légumes Croquants','Encas rassasiant sans glucides. Portable, sans cuisson.',150,115,9,5,6,'perte_poids',11) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Œuf dur','1 gros (~60g)',80,6,0,6,1 from o union all
select id,'Bâtonnets de concombre & carotte','100g',30,1,6,0,2 from o;

-- ============================================
-- PRISE DE MASSE — Hypercalorique, riche en protéines ET glucides
-- ============================================

-- Petit-déjeuner prise de masse
with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('petit-dejeuner','Mega Bowl Avoine, Banane & Beurre d''Amande','Petit-déjeuner hypercalorique pour maximiser la récupération musculaire.',450,620,30,75,18,'prise_masse',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Flocons d''avoine','80g',300,10,50,6,1 from o union all
select id,'Banane','1 grande (~180g)',160,2,38,0,2 from o union all
select id,'Beurre d''amande','20g',125,4,4,11,3 from o union all
select id,'Lait entier','100ml',65,3,5,4,4 from o union all
select id,'Graines de chia','10g',50,2,5,3,5 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('petit-dejeuner','Omelette 4 Œufs, Fromage & Pain Complet','Petit-déjeuner solide riche en protéines et bons glucides pour bien démarrer.',350,550,38,32,22,'prise_masse',11) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Œufs entiers','4 (~240g)',300,26,1,20,1 from o union all
select id,'Fromage râpé allégé','30g',80,8,1,5,2 from o union all
select id,'Pain complet','80g (2 tranches)',170,6,30,2,3 from o;

-- Déjeuner prise de masse
with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('dejeuner','Poulet, Riz & Avocat — Edition Masse','Version hypercalorique du classique, avec avocat pour les bons lipides.',650,750,52,70,20,'prise_masse',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Filet de poulet grillé','200g',220,44,0,4,1 from o union all
select id,'Riz basmati cuit','300g',390,8,84,1,2 from o union all
select id,'Avocat','80g',130,1,7,13,3 from o union all
select id,'Huile d''olive','5g',45,0,0,5,4 from o union all
select id,'Sauce soja & épices','10ml',10,1,1,0,5 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('dejeuner','Pâtes au Bœuf & Sauce Tomate Maison','Repas hypercalorique classique de la musculation. Énergie maximale pour l''après-midi.',550,720,48,80,16,'prise_masse',11) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Pâtes complètes cuites','250g',320,12,63,2,1 from o union all
select id,'Bœuf haché 5% MG','150g',210,30,0,10,2 from o union all
select id,'Sauce tomate maison','100g',45,2,8,1,3 from o union all
select id,'Parmesan râpé','15g',60,4,0,5,4 from o;

-- Dîner prise de masse
with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('diner','Saumon, Patate Douce & Riz — Edition Masse','Dîner anabolisant riche en protéines, glucides complexes et Oméga-3.',550,680,42,65,22,'prise_masse',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Pavé de saumon','160g',335,34,0,22,1 from o union all
select id,'Patate douce cuite','200g',170,3,40,0,2 from o union all
select id,'Riz basmati cuit','100g',130,3,28,0,3 from o union all
select id,'Huile d''olive','5g',45,0,0,5,4 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('diner','Poulet, Lentilles & Légumes Rôtis','Dîner complet à index glycémique bas mais très calorique. Parfait avant le coucher.',500,580,48,55,12,'prise_masse',11) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Blanc de poulet','180g',200,40,0,4,1 from o union all
select id,'Lentilles cuites','150g',175,12,27,1,2 from o union all
select id,'Légumes rôtis (courgette, poivron)','150g',60,2,10,2,3 from o union all
select id,'Huile d''olive','15g',135,0,0,15,4 from o;

-- Collation prise de masse
with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('collation','Gainer Maison — Shake Banane & Avoine','Shaker hypercalorique maison. Bien plus économique que les gainers du commerce.',450,520,35,72,8,'prise_masse',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Whey protéine','40g',145,32,3,2,1 from o union all
select id,'Banane','1 moyenne (~150g)',130,2,30,0,2 from o union all
select id,'Flocons d''avoine mixés','40g',150,5,25,3,3 from o union all
select id,'Lait entier','200ml',130,6,10,7,4 from o union all
select id,'Beurre de cacahuète','10g',60,2,2,5,5 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('collation','Riz au Lait Protéiné & Amandes','Encas calorique doux, riche en protéines lentes. Idéal entre deux repas.',300,410,28,45,12,'prise_masse',11) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Fromage blanc 20%','200g',140,16,8,6,1 from o union all
select id,'Riz cuit froid','100g',130,3,28,0,2 from o union all
select id,'Amandes','20g',120,4,4,10,3 from o union all
select id,'Miel','10g',30,0,8,0,4 from o;

-- ============================================
-- MAINTIEN — Équilibré, varié
-- ============================================

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('petit-dejeuner','Toast Avocat, Œuf Poché & Graines','Petit-déjeuner tendance, équilibré et rassasiant.',280,385,18,28,20,'maintien',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Pain de seigle','60g',125,5,22,1,1 from o union all
select id,'Avocat','80g',130,1,7,13,2 from o union all
select id,'Œuf poché','1 (~60g)',80,6,0,6,3 from o union all
select id,'Graines de courge & lin','10g',55,2,2,5,4 from o union all
select id,'Jus de citron & sel','5ml',5,0,0,0,5 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('dejeuner','Bowl Méditerranéen — Pois Chiches & Feta','Repas coloré et équilibré. Riche en fibres et bons lipides.',450,465,22,48,18,'maintien',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Pois chiches cuits','150g',220,12,32,4,1 from o union all
select id,'Feta','40g',105,6,1,9,2 from o union all
select id,'Tomates, concombre, olives','200g',65,2,8,3,3 from o union all
select id,'Huile d''olive','10g',90,0,0,10,4 from o union all
select id,'Jus de citron & origan','10ml',5,0,1,0,5 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('diner','Risotto Poulet & Légumes','Repas chaud et réconfortant, équilibré en macros.',500,490,32,58,12,'maintien',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Blanc de poulet','120g',135,26,0,3,1 from o union all
select id,'Riz arborio','80g',285,6,62,0,2 from o union all
select id,'Courgettes & champignons','150g',35,3,5,0,3 from o union all
select id,'Parmesan','15g',60,4,0,5,4 from o union all
select id,'Bouillon de légumes','200ml',15,1,3,0,5 from o union all
select id,'Huile d''olive','5g',45,0,0,5,6 from o;

with o as (insert into options_repas (type,nom,profil,poids_total_g,kcal,proteines_g,glucides_g,lipides_g,objectif_cible,ordre)
values ('collation','Fruit & Noix Mix','Collation naturelle équilibrée. Fibres, sucres naturels et bons lipides.',150,220,5,25,12,'maintien',10) returning id)
insert into options_repas_ingredients (option_repas_id,nom,quantite,kcal,proteines_g,glucides_g,lipides_g,ordre)
select id,'Pomme ou poire','1 moyenne (~150g)',80,0,20,0,1 from o union all
select id,'Noix de cajou & noisettes','25g',145,4,8,12,2 from o;
