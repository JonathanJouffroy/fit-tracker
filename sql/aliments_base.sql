-- ============================================
-- TABLE ALIMENTS DE BASE
-- Valeurs nutritionnelles pour 100g
-- ============================================

create table if not exists aliments_base (
  id bigint generated always as identity primary key,
  nom text not null,
  kcal_100g numeric not null,
  proteines_100g numeric default 0,
  glucides_100g numeric default 0,
  lipides_100g numeric default 0,
  categorie text default 'autre' -- viandes, poissons, feculents, legumes, fruits, laitiers, oeufs, legumineuses, corps_gras, autre
);

-- Ajout d'aliments supplémentaires
insert into aliments_base (nom, kcal_100g, proteines_100g, glucides_100g, lipides_100g, categorie) values
('Riz basmati cuit',            130, 2.7, 28.0,  0.3,  'feculents'),
('Riz basmati cru',             350, 7.0, 77.0,  0.6,  'feculents'),
('Riz jasmin cuit',             129, 2.4, 28.0,  0.3,  'feculents'),
('Farine de blé',               364, 10.0, 76.0, 1.0,  'feculents'),
('Pain de mie',                 267, 8.0, 48.0,  4.5,  'feculents'),
('Tortilla de blé',             306, 8.0, 51.0,  7.0,  'feculents'),
('Galettes de riz',             385, 7.5, 82.0,  2.0,  'feculents'),
('Bœuf entrecôte',              280, 22.0, 0.0, 21.0,  'viandes'),
('Escalope de veau',            105, 20.0, 0.0,  2.5,  'viandes'),
('Filet de cabillaud',           82, 18.5, 0.0,  0.7,  'poissons'),
('Maquereau',                   205, 19.0, 0.0, 14.0,  'poissons'),
('Œufs de caille',              158, 13.0, 0.3, 11.0,  'oeufs'),
('Tofu ferme',                   76, 8.0,  1.9,  4.5,  'legumineuses'),
('Tempeh',                      193, 19.0, 9.0, 11.0,  'legumineuses'),
('Pois cassés cuits',           118, 8.3, 21.0,  0.4,  'legumineuses'),
('Haricots blancs cuits',       127, 8.7, 23.0,  0.5,  'legumineuses'),
('Poireau',                      31, 1.8,  6.5,  0.3,  'legumes'),
('Chou-fleur',                   25, 1.9,  5.0,  0.3,  'legumes'),
('Chou brocoli',                 34, 2.8,  6.6,  0.4,  'legumes'),
('Aubergine',                    25, 1.0,  5.7,  0.2,  'legumes'),
('Asperges',                     20, 2.2,  3.9,  0.1,  'legumes'),
('Betterave rouge',              43, 1.6,  9.6,  0.1,  'legumes'),
('Maïs',                        86, 3.2, 19.0,  1.2,  'legumes'),
('Petits pois',                  81, 5.4, 14.5,  0.4,  'legumes'),
('Pamplemousse',                 42, 0.8, 10.7,  0.1,  'fruits'),
('Kiwi',                         61, 1.1, 14.7,  0.5,  'fruits'),
('Raisin',                       69, 0.6, 18.1,  0.2,  'fruits'),
('Pastèque',                     30, 0.6,  7.6,  0.2,  'fruits'),
('Ananas',                       50, 0.5, 13.1,  0.1,  'fruits'),
('Skyr nature',                  65, 11.0, 4.0,  0.2,  'laitiers'),
('Fromage blanc 20%',            88, 7.0,  4.5,  4.5,  'laitiers'),
('Ricotta',                     174, 11.0, 3.0, 13.0,  'laitiers'),
('Crème fraîche 15%',           162, 3.0,  3.0, 15.0,  'laitiers'),
('Lait entier',                  61, 3.2,  4.8,  3.5,  'laitiers'),
('Huile de coco',               892, 0.0,  0.0, 100.0, 'corps_gras'),
('Huile de tournesol',          884, 0.0,  0.0, 100.0, 'corps_gras'),
('Noix de cajou',               553, 18.0, 30.0, 44.0, 'corps_gras'),
('Pistaches',                   562, 20.0, 28.0, 45.0, 'corps_gras'),
('Graines de lin',              534, 18.0, 29.0, 42.0, 'corps_gras'),
('Tahini (purée de sésame)',    595, 17.0, 21.0, 53.0, 'corps_gras'),
('Miel',                        304, 0.3, 82.0,  0.0,  'autre'),
('Sucre blanc',                 399, 0.0, 100.0, 0.0,  'autre'),
('Chocolat noir 70%',           598, 7.8, 46.0, 42.0,  'autre'),
('Sauce soja',                   60, 8.1,  5.6,  0.1,  'autre'),
('Ketchup',                     101, 1.2, 25.0,  0.1,  'autre'),
('Mayonnaise',                  680, 1.4,  2.6, 75.0,  'autre'),
('Carottes râpées',              41, 0.9,  9.6,  0.2,  'legumes'),
('Épinards surgelés',            23, 2.9,  3.6,  0.4,  'legumes');

create index if not exists idx_aliments_nom on aliments_base using gin(to_tsvector('french', nom));

-- Insertion des aliments courants (valeurs pour 100g)
insert into aliments_base (nom, kcal_100g, proteines_100g, glucides_100g, lipides_100g, categorie) values

-- VIANDES & VOLAILLES
('Blanc de poulet cuit',         165, 31.0, 0.0,  3.6,  'viandes'),
('Blanc de poulet cru',          110, 23.0, 0.0,  2.0,  'viandes'),
('Cuisse de poulet cuite',       215, 26.0, 0.0, 12.0,  'viandes'),
('Bœuf haché 5%',                137, 21.0, 0.0,  5.0,  'viandes'),
('Bœuf haché 15%',               215, 19.0, 0.0, 15.0,  'viandes'),
('Steak bœuf',                   195, 26.0, 0.0,  9.0,  'viandes'),
('Filet mignon porc',            143, 22.0, 0.0,  5.5,  'viandes'),
('Côte de porc',                 242, 22.0, 0.0, 16.5,  'viandes'),
('Jambon blanc',                  97, 15.5, 1.0,  3.5,  'viandes'),
('Lardons fumés',                337, 21.0, 0.5, 28.0,  'viandes'),
('Dinde émincée cuite',          157, 29.0, 0.0,  4.0,  'viandes'),

-- POISSONS & FRUITS DE MER
('Saumon cuit',                  206, 25.0, 0.0, 12.0,  'poissons'),
('Saumon cru',                   180, 20.0, 0.0, 11.0,  'poissons'),
('Thon en boîte (eau)',          103, 23.0, 0.0,  1.0,  'poissons'),
('Cabillaud cuit',                82, 18.5, 0.0,  0.7,  'poissons'),
('Crevettes cuites',              85, 18.0, 0.5,  1.0,  'poissons'),
('Sardines en boîte',            208, 24.0, 0.0, 12.0,  'poissons'),

-- ŒUFS
('Œuf entier',                   143, 13.0, 0.7, 10.0,  'oeufs'),
('Blanc d''œuf',                  52, 11.0, 0.7,  0.2,  'oeufs'),
('Jaune d''œuf',                 322, 16.0, 0.3, 27.0,  'oeufs'),

-- FÉCULENTS
('Riz blanc cuit',               130, 2.7, 28.0,  0.3,  'feculents'),
('Riz blanc cru',                350, 7.0, 77.0,  0.6,  'feculents'),
('Riz complet cuit',             111, 2.6, 23.0,  0.9,  'feculents'),
('Pâtes cuites',                 157, 5.5, 31.0,  0.9,  'feculents'),
('Pâtes crues',                  353, 12.5, 70.0, 1.5,  'feculents'),
('Pomme de terre cuite',          77, 2.0, 17.0,  0.1,  'feculents'),
('Patate douce cuite',            86, 1.6, 20.0,  0.1,  'feculents'),
('Quinoa cuit',                  120, 4.4, 21.3,  1.9,  'feculents'),
('Pain complet',                 247, 9.0, 44.0,  3.5,  'feculents'),
('Pain blanc',                   265, 8.5, 50.0,  3.0,  'feculents'),
('Flocons d''avoine',            389, 13.5, 66.0, 7.0,  'feculents'),
('Lentilles cuites',             116, 9.0, 20.0,  0.4,  'legumineuses'),
('Pois chiches cuits',           164, 8.9, 27.4,  2.6,  'legumineuses'),
('Haricots rouges cuits',        127, 8.7, 22.8,  0.5,  'legumineuses'),
('Edamame',                      122, 11.0, 9.0,  5.0,  'legumineuses'),

-- LÉGUMES
('Brocolis',                      34, 2.8,  6.6,  0.4,  'legumes'),
('Épinards',                      23, 2.9,  3.6,  0.4,  'legumes'),
('Tomate',                        18, 0.9,  3.5,  0.2,  'legumes'),
('Courgette',                     17, 1.2,  3.1,  0.3,  'legumes'),
('Poivron rouge',                 31, 1.0,  6.0,  0.3,  'legumes'),
('Champignons',                   22, 3.1,  3.3,  0.3,  'legumes'),
('Haricots verts',                31, 1.8,  6.9,  0.1,  'legumes'),
('Carotte',                       41, 0.9,  9.6,  0.2,  'legumes'),
('Concombre',                     16, 0.7,  3.6,  0.1,  'legumes'),
('Salade verte',                  15, 1.4,  2.2,  0.2,  'legumes'),

-- FRUITS
('Banane',                        89, 1.1, 22.8,  0.3,  'fruits'),
('Pomme',                         52, 0.3, 13.8,  0.2,  'fruits'),
('Orange',                        47, 0.9, 11.8,  0.1,  'fruits'),
('Fraises',                       33, 0.7,  7.7,  0.3,  'fruits'),
('Avocat',                       160, 2.0,  8.5, 14.7,  'fruits'),
('Myrtilles',                     57, 0.7, 14.5,  0.3,  'fruits'),
('Mangue',                        65, 0.5, 17.0,  0.3,  'fruits'),

-- PRODUITS LAITIERS
('Fromage blanc 0%',              45, 7.8,  4.0,  0.2,  'laitiers'),
('Fromage blanc 3%',              66, 7.5,  4.5,  3.0,  'laitiers'),
('Yaourt nature',                 59, 3.8,  5.0,  3.0,  'laitiers'),
('Lait demi-écrémé',              46, 3.2,  5.0,  1.6,  'laitiers'),
('Parmesan',                     431, 38.0, 0.0, 30.0,  'laitiers'),
('Emmental',                     382, 28.5, 0.0, 29.5,  'laitiers'),
('Mozzarella',                   257, 18.0, 2.7, 20.0,  'laitiers'),

-- CORPS GRAS & OLÉAGINEUX
('Huile d''olive',               884, 0.0,  0.0, 100.0, 'corps_gras'),
('Beurre',                       717, 0.6,  0.5, 81.0,  'corps_gras'),
('Amandes',                      579, 21.0, 22.0, 49.0, 'corps_gras'),
('Noix',                         654, 15.0, 14.0, 60.0, 'corps_gras'),
('Beurre de cacahuète',          588, 25.0, 20.0, 50.0, 'corps_gras'),
('Graines de chia',              486, 16.5, 42.1, 30.7, 'corps_gras'),

-- PROTÉINES EN POUDRE
('Whey protéine (nature)',        373, 80.0, 7.0,  4.5,  'autre'),
('Whey protéine (chocolat)',      380, 75.0, 11.0, 5.0,  'autre');
