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
  // Retourne un float — arrondir seulement dans le total final
  return met * poidsCorps * dureeHeures
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
export function calculerCaloriesCardio({ activiteId, dureeMinutes, poidsCorps, deniveleM = 0 }) {
  if (!poidsCorps || !dureeMinutes) return 0
  const activite = ACTIVITES_CARDIO.find(a => a.id === activiteId)
  if (!activite) return 0
  const dureeHeures = dureeMinutes / 60

  // Calories de base via MET
  let kcal = activite.met * poidsCorps * dureeHeures

  // Bonus dénivelé positif — formule standard : ~8 kcal par 100m de D+ par 10kg de poids
  // Applicable aux activités avec dénivelé (marche, randonnée, course)
  const activitesAvecDenivele = ['marche', 'randonnee', 'course']
  if (deniveleM > 0 && activitesAvecDenivele.includes(activiteId)) {
    const bonusKcal = (deniveleM / 100) * (poidsCorps / 10) * 8
    kcal += bonusKcal
  }

  return Math.round(kcal)
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

// ============================================
// MODE COACH
// ============================================

// Arrondi à 0.5kg
function arrondir(kg) { return Math.round(kg * 2) / 2 }

// Analyse l'historique d'un exercice et retourne un diagnostic + recommandations
// sessions : [{ date, series: [{ poids, reps }] }]
export function analyserProgression(sessions) {
  if (!sessions || sessions.length === 0) {
    return { statut: 'debut', message: 'Pas encore de données pour cet exercice.', couleur: '#888', suggestion: null }
  }

  // Filtrer les séances avec au moins une série avec poids
  const avecDonnees = sessions.filter(s =>
    s.series?.some(serie => serie.poids > 0) || (s.poids_max && s.poids_max > 0)
  )

  if (avecDonnees.length < 2) {
    return { statut: 'debut', message: 'Continue encore quelques séances pour que le coach puisse analyser ta progression.', couleur: '#888', suggestion: null }
  }

  // Normaliser — supporter l'ancien format { poids_max, reps_max } ET le nouveau { series }
  const seances = avecDonnees.map(s => {
    if (s.series && s.series.length > 0) {
      const seriesAvecPoids = s.series.filter(sr => sr.poids > 0)
      const poidsMax = Math.max(...seriesAvecPoids.map(sr => sr.poids))
      const poidsMoyen = seriesAvecPoids.reduce((a, sr) => a + sr.poids, 0) / seriesAvecPoids.length
      const repsMoyennes = s.series.reduce((a, sr) => a + (sr.reps || 0), 0) / s.series.length
      const derniereSeriesPoids = seriesAvecPoids.map(sr => sr.poids)
      // Décrochage : si la dernière série est plus faible que la première
      const decrochage = derniereSeriesPoids.length > 1 &&
        derniereSeriesPoids[derniereSeriesPoids.length - 1] < derniereSeriesPoids[0]
      // Consistance : ratio entre poids min et max des séries
      const poidsMin = Math.min(...seriesAvecPoids.map(sr => sr.poids))
      const consistance = poidsMin / poidsMax // 1.0 = parfait, <0.9 = beaucoup de variation
      return { date: s.date, poidsMax, poidsMoyen, repsMoyennes, decrochage, consistance, nbSeries: s.series.length }
    } else {
      // Ancien format
      return { date: s.date, poidsMax: s.poids_max, poidsMoyen: s.poids_max, repsMoyennes: s.reps_max || 8, decrochage: false, consistance: 1, nbSeries: 1 }
    }
  })

  const derniere = seances[seances.length - 1]
  const avantDerniere = seances[seances.length - 2]

  // Jours depuis la dernière séance
  const joursDepuisDerniere = Math.floor(
    (Date.now() - new Date(derniere.date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24)
  )

  // Déload : plus de 14 jours sans séance
  if (joursDepuisDerniere > 14) {
    const poidsReprise = arrondir(derniere.poidsMax * 0.85)
    return {
      statut: 'deload',
      message: `Aucune séance depuis ${joursDepuisDerniere} jours. Reprends à ${poidsReprise}kg (85% de ta dernière charge) pour éviter les blessures.`,
      couleur: '#f59e0b',
      suggestion: { poids: poidsReprise, raison: 'Reprise après pause' }
    }
  }

  // Décrochage en fin de séance : la dernière série était plus faible
  if (derniere.decrochage && derniere.consistance < 0.92) {
    // Ne pas augmenter — consolider d'abord
    const suggestion = arrondir(derniere.poidsMoyen)
    return {
      statut: 'decrochage',
      message: `Tu as dû baisser le poids en fin de séance (consistance ${Math.round(derniere.consistance * 100)}%). Consolide à ${suggestion}kg sur toutes les séries avant d'augmenter.`,
      couleur: '#f59e0b',
      suggestion: { poids: suggestion, raison: 'Consolidation des séries' }
    }
  }

  // Analyser la tendance sur les 4 dernières séances
  const recentes = seances.slice(-4)
  const poidsRecents = recentes.map(s => s.poidsMax)
  const delta = derniere.poidsMax - avantDerniere.poidsMax

  // Régression : poids max en baisse sur 2+ séances consécutives
  const regression = seances.length >= 3 &&
    seances.slice(-3).every((s, i, arr) => i === 0 || s.poidsMax <= arr[i - 1].poidsMax) &&
    seances[seances.length - 1].poidsMax < seances[seances.length - 3].poidsMax

  // Plateau : même poids max sur 3+ séances
  const plateau = seances.length >= 3 &&
    seances.slice(-3).every(s => s.poidsMax === derniere.poidsMax)

  // Progression propre : poids augmente ET bonne consistance
  const progressionPropre = delta > 0 && derniere.consistance >= 0.92

  if (regression) {
    const suggestion = arrondir(derniere.poidsMax * 0.95)
    return {
      statut: 'regression',
      message: `Ton poids a baissé sur les dernières séances. Vérifie ta récupération et ton sommeil. Reste à ${suggestion}kg pour consolider.`,
      couleur: '#ef4444',
      suggestion: { poids: suggestion, raison: 'Consolidation avant nouvelle progression' }
    }
  }

  if (plateau) {
    // Sur un plateau avec bonne consistance → augmenter
    // Sur un plateau avec mauvaise consistance → consolider d'abord
    if (derniere.consistance >= 0.95) {
      const suggestion = arrondir(derniere.poidsMax + 2.5)
      return {
        statut: 'plateau',
        message: `Tu es stable à ${derniere.poidsMax}kg avec une bonne consistance. C'est le moment de passer à ${suggestion}kg !`,
        couleur: '#f59e0b',
        suggestion: { poids: suggestion, raison: 'Dépassement du plateau' }
      }
    } else {
      return {
        statut: 'plateau',
        message: `Tu es à ${derniere.poidsMax}kg mais avec une variation entre tes séries (${Math.round(derniere.consistance * 100)}% de consistance). Stabilise toutes tes séries au même poids avant d'augmenter.`,
        couleur: '#f59e0b',
        suggestion: { poids: arrondir(derniere.poidsMax), raison: 'Améliorer la consistance' }
      }
    }
  }

  if (progressionPropre) {
    const increment = delta <= 2.5 ? delta : 2.5
    const suggestion = arrondir(derniere.poidsMax + increment)
    return {
      statut: 'progression',
      message: `Belle progression ! +${delta}kg depuis la dernière séance avec une bonne consistance (${Math.round(derniere.consistance * 100)}%). Continue avec ${suggestion}kg.`,
      couleur: '#22c55e',
      suggestion: { poids: suggestion, raison: 'Continuation de la progression' }
    }
  }

  // Progression mais avec décrochage léger
  if (delta > 0 && derniere.consistance < 0.92) {
    return {
      statut: 'progression_fragile',
      message: `Tu as progressé en poids max mais avec une variation entre tes séries. Consolide ${derniere.poidsMax}kg sur toutes les séries avant d'augmenter.`,
      couleur: '#f59e0b',
      suggestion: { poids: arrondir(derniere.poidsMax), raison: 'Consolider la progression' }
    }
  }

  // Cas neutre : stable
  const suggestion = arrondir(derniere.poidsMax + 2.5)
  return {
    statut: 'stable',
    message: `Tu te maintiens autour de ${derniere.poidsMax}kg. Essaie ${suggestion}kg sur ta prochaine séance.`,
    couleur: '#3B82F6',
    suggestion: { poids: suggestion, raison: 'Prochaine étape' }
  }
}

// Calcule la progression vers un objectif
export function progressionVersObjectif(sessions, objectif) {
  if (!objectif || !sessions || sessions.length === 0) return null
  const avecPoids = sessions.filter(s => s.poids_max !== null && s.poids_max > 0)
  if (avecPoids.length === 0) return null

  const poidsActuel = avecPoids[avecPoids.length - 1].poids_max
  const premiereSeance = avecPoids[0]
  const poidsDepart = premiereSeance.poids_max

  const joursTotal = Math.floor(
    (new Date(objectif.date_cible + 'T12:00:00') - new Date(premiereSeance.date + 'T12:00:00')) / (1000 * 60 * 60 * 24)
  )
  const joursEcoules = Math.floor(
    (Date.now() - new Date(premiereSeance.date + 'T12:00:00')) / (1000 * 60 * 60 * 24)
  )
  const joursRestants = Math.max(0, Math.floor(
    (new Date(objectif.date_cible + 'T12:00:00') - Date.now()) / (1000 * 60 * 60 * 24)
  ))

  const progressionReelle = poidsActuel - poidsDepart
  const progressionCible = objectif.poids_cible_kg - poidsDepart
  const pourcentage = progressionCible > 0
    ? Math.min(100, Math.round((progressionReelle / progressionCible) * 100))
    : 100

  // Trajectoire théorique au jourd'hui
  const ratio = joursTotal > 0 ? joursEcoules / joursTotal : 1
  const poidsTheorique = poidsDepart + progressionCible * Math.min(ratio, 1)
  const avance = poidsActuel - poidsTheorique

  return {
    poidsActuel,
    poidsCible: objectif.poids_cible_kg,
    poidsDepart,
    pourcentage,
    joursRestants,
    avance: Math.round(avance * 10) / 10,
    enAvance: avance >= 0,
  }
}

// ============================================
// MAPPING EXERCICE → GROUPE MUSCULAIRE
// Pour la silhouette de partage
// ============================================

// Zones disponibles : epaules, pectoraux, dos, biceps, triceps, abdos, fessiers, quadriceps, ischios, mollets
export const MAPPING_MUSCLES = [
  // Jambes
  { mots: ['squat', 'fente', 'leg press', 'presse à cuisses', 'hack squat'], zones: ['quadriceps', 'fessiers'] },
  { mots: ['soulevé de terre', 'deadlift', 'rdl', 'romanian'], zones: ['ischios', 'fessiers', 'dos'] },
  { mots: ['leg curl', 'ischio'], zones: ['ischios'] },
  { mots: ['leg extension', 'extension jambes'], zones: ['quadriceps'] },
  { mots: ['mollet', 'calf', 'extension mollets'], zones: ['mollets'] },
  { mots: ['hip thrust', 'fessier', 'glute'], zones: ['fessiers'] },

  // Pectoraux
  { mots: ['développé couché', 'bench press', 'développé incliné', 'développé décliné', 'pec deck', 'écarté'], zones: ['pectoraux', 'triceps'] },
  { mots: ['pompe', 'push up', 'dips'], zones: ['pectoraux', 'triceps'] },

  // Dos
  { mots: ['rowing', 'row', 'tirage', 'traction', 'pull up', 'lat pulldown'], zones: ['dos', 'biceps'] },

  // Épaules
  { mots: ['développé militaire', 'développé épaules', 'overhead press', 'élévation latérale', 'élévation frontale', 'shoulder press', 'arnold press'], zones: ['epaules'] },

  // Bras
  { mots: ['curl biceps', 'curl marteau', 'curl', 'biceps'], zones: ['biceps'] },
  { mots: ['triceps', 'extension triceps', 'barre au front', 'skull crusher', 'pushdown'], zones: ['triceps'] },

  // Abdos
  { mots: ['abdo', 'crunch', 'gainage', 'plank', 'ab wheel', 'relevé de jambes'], zones: ['abdos'] },
]

// Détermine les zones travaillées à partir du nom d'un exercice
export function zonesPourExercice(nomExercice) {
  if (!nomExercice) return []
  const nom = nomExercice.toLowerCase()
  for (const entry of MAPPING_MUSCLES) {
    if (entry.mots.some(mot => nom.includes(mot))) {
      return entry.zones
    }
  }
  return []
}

// Détermine toutes les zones travaillées dans une séance (liste d'exercices)
export function zonesPourSeance(exercices) {
  const zones = new Set()
  exercices.forEach(exo => {
    zonesPourExercice(exo.nom).forEach(z => zones.add(z))
  })
  return [...zones]
}
