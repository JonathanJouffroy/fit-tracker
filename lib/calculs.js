// Calcul du métabolisme de base (BMR) selon Mifflin-St Jeor
export function calculerBMR({ poids, taille, age, sexe }) {
  // Mifflin-St Jeor :
  // Homme : (10 × poids) + (6.25 × taille) - (5 × âge) + 5
  // Femme : (10 × poids) + (6.25 × taille) - (5 × âge) - 161
  const base = 10 * poids + 6.25 * taille - 5 * age
  return sexe === 'homme' ? base + 5 : base - 161
}

export const NIVEAUX_ACTIVITE = [
  { value: 'sedentaire', label: 'Sédentaire', description: 'Peu ou pas de sport', facteur: 1.2 },
  { value: 'leger', label: 'Légèrement actif', description: '1 à 3 fois/semaine', facteur: 1.375 },
  { value: 'modere', label: 'Modérément actif', description: '3 à 5 fois/semaine', facteur: 1.55 },
  { value: 'intense', label: 'Très actif', description: '6 à 7 fois/semaine', facteur: 1.725 },
  { value: 'tres_intense', label: 'Extrêmement actif', description: 'Sport intense quotidien / travail physique', facteur: 1.9 },
]

export const OBJECTIFS = [
  { value: 'perte_poids', label: 'Perte de poids', description: '-15% des calories', facteur: 0.85 },
  { value: 'maintien', label: 'Maintien', description: 'Calories d\'équilibre', facteur: 1 },
  { value: 'prise_masse', label: 'Prise de masse', description: '+15% des calories', facteur: 1.15 },
]

// TDEE = BMR x facteur d'activité, puis ajusté selon l'objectif
export function calculerCaloriesCible({ poids, taille, age, sexe, niveauActivite, objectif }) {
  const bmr = calculerBMR({ poids, taille, age, sexe })
  const niveauObj = NIVEAUX_ACTIVITE.find((n) => n.value === niveauActivite)
  const objectifObj = OBJECTIFS.find((o) => o.value === objectif)

  const tdee = bmr * (niveauObj?.facteur || 1.2)
  const caloriesCible = tdee * (objectifObj?.facteur || 1)

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    caloriesCible: Math.round(caloriesCible),
  }
}

// ============================================
// CALORIES DÉPENSÉES PAR EXERCICE (méthode MET)
// ============================================

// Temps moyen par répétition en musculation (phase concentrique + excentrique)
const SECONDES_PAR_REPETITION = 3

// MET (Metabolic Equivalent) selon l'intensité relative de la charge
// Référence : Compendium of Physical Activities (musculation légère/modérée/intense)
function determinerMET(poidsCharge, poidsCorps) {
  if (!poidsCharge || poidsCharge <= 0) return 3.5 // poids du corps / charge non renseignée
  const intensiteRelative = poidsCharge / poidsCorps

  if (intensiteRelative < 0.3) return 3.5   // charge légère
  if (intensiteRelative < 0.6) return 5.0   // charge modérée
  return 6.0                                 // charge élevée
}

// Calcule les calories dépensées pour UN exercice (toutes ses séries cumulées)
export function calculerCaloriesExercice({ series, repetitions, poidsCharge, poidsCorps }) {
  if (!poidsCorps || poidsCorps <= 0) return 0

  const met = determinerMET(poidsCharge, poidsCorps)
  const dureeSecondesTotale = series * repetitions * SECONDES_PAR_REPETITION
  const dureeHeures = dureeSecondesTotale / 3600

  // Formule standard : kcal = MET × poids (kg) × durée (heures)
  const kcal = met * poidsCorps * dureeHeures
  return Math.round(kcal)
}

// ============================================
// EXERCICES CARDIO
// ============================================

export const ACTIVITES_CARDIO = [
  {
    id: 'natation',
    label: 'Natation 🏊',
    met: 6.0,
    metriques: [
      { id: 'duree_minutes', label: 'Durée (min)', type: 'number', required: true, placeholder: '45' },
      { id: 'distance_m', label: 'Distance (m)', type: 'number', required: false, placeholder: '1500' },
      { id: 'note_cardio', label: 'Style (optionnel)', type: 'text', required: false, placeholder: 'Crawl, brasse...' },
    ],
  },
  {
    id: 'course',
    label: 'Course à pied 🏃',
    met: 9.8,
    metriques: [
      { id: 'duree_minutes', label: 'Durée (min)', type: 'number', required: true, placeholder: '30' },
      { id: 'distance_m', label: 'Distance (km)', type: 'number', required: false, placeholder: '5', unite: 'km' },
    ],
  },
  {
    id: 'velo',
    label: 'Vélo 🚴',
    met: 7.5,
    metriques: [
      { id: 'duree_minutes', label: 'Durée (min)', type: 'number', required: true, placeholder: '60' },
      { id: 'distance_m', label: 'Distance (km)', type: 'number', required: false, placeholder: '20', unite: 'km' },
      { id: 'denivele_m', label: 'Dénivelé (m)', type: 'number', required: false, placeholder: '200' },
    ],
  },
  {
    id: 'marche',
    label: 'Marche 🚶',
    met: 3.5,
    metriques: [
      { id: 'duree_minutes', label: 'Durée (min)', type: 'number', required: true, placeholder: '45' },
      { id: 'distance_m', label: 'Distance (km)', type: 'number', required: false, placeholder: '3', unite: 'km' },
      { id: 'denivele_m', label: 'Dénivelé (m)', type: 'number', required: false, placeholder: '100' },
    ],
  },
  {
    id: 'randonnee',
    label: 'Randonnée 🥾',
    met: 6.0,
    metriques: [
      { id: 'duree_minutes', label: 'Durée (min)', type: 'number', required: true, placeholder: '120' },
      { id: 'distance_m', label: 'Distance (km)', type: 'number', required: false, placeholder: '10', unite: 'km' },
      { id: 'denivele_m', label: 'Dénivelé (m)', type: 'number', required: true, placeholder: '500' },
    ],
  },
  {
    id: 'elliptique',
    label: 'Elliptique 〰️',
    met: 5.0,
    metriques: [
      { id: 'duree_minutes', label: 'Durée (min)', type: 'number', required: true, placeholder: '30' },
      { id: 'note_cardio', label: 'Résistance (optionnel)', type: 'text', required: false, placeholder: 'Niveau 8...' },
    ],
  },
  {
    id: 'rameur',
    label: 'Rameur 🚣',
    met: 7.0,
    metriques: [
      { id: 'duree_minutes', label: 'Durée (min)', type: 'number', required: true, placeholder: '20' },
      { id: 'distance_m', label: 'Distance (m)', type: 'number', required: false, placeholder: '5000' },
    ],
  },
  {
    id: 'corde',
    label: 'Corde à sauter 🪢',
    met: 10.0,
    metriques: [
      { id: 'duree_minutes', label: 'Durée (min)', type: 'number', required: true, placeholder: '15' },
      { id: 'nb_sauts', label: 'Nombre de sauts', type: 'number', required: false, placeholder: '1000' },
    ],
  },
]

// Calcul calories cardio : MET × poids corps × durée en heures
export function calculerCaloriesCardio({ activiteId, dureeMinutes, poidsCorps }) {
  if (!poidsCorps || !dureeMinutes) return 0
  const activite = ACTIVITES_CARDIO.find(a => a.id === activiteId)
  if (!activite) return 0
  const dureeHeures = dureeMinutes / 60
  return Math.round(activite.met * poidsCorps * dureeHeures)
}

// Formater les métriques pour l'affichage dans l'historique
export function formaterMetriquesCardio(log, activiteId) {
  const parties = []
  if (log.duree_minutes) parties.push(`${log.duree_minutes}min`)
  if (log.distance_m) {
    const activite = ACTIVITES_CARDIO.find(a => a.id === activiteId)
    const metrique = activite?.metriques.find(m => m.id === 'distance_m')
    parties.push(metrique?.unite === 'km' ? `${log.distance_m}km` : `${log.distance_m}m`)
  }
  if (log.denivele_m) parties.push(`+${log.denivele_m}m D+`)
  if (log.nb_sauts) parties.push(`${log.nb_sauts} sauts`)
  if (log.note_cardio) parties.push(log.note_cardio)
  return parties.join(' · ')
}
