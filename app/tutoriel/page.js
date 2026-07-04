'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SLIDES = [
  {
    icon: '📅',
    titre: 'Bienvenue sur Fit Tracker',
    texte: "Ton compagnon d'entraînement complet : séances, nutrition, progression et coaching automatique. Ce guide te montre tout ce que tu peux faire.",
    couleur: '#FF5722',
  },
  {
    icon: '🏋️',
    titre: 'Tes séances',
    texte: "Sur l'onglet Séances, planifie tes exercices jour par jour. Trois types d'exercices disponibles : musculation, cardio, et circuits.",
    points: [
      'Muscu : séries, reps, poids — timer de repos entre chaque série avec bip sonore',
      'Cardio : 8 activités avec métriques dédiées (distance, dénivelé, allure)',
      '⚡ Circuit : plusieurs exercices enchaînés avec un nombre de tours configurable',
      'Glisse-dépose les exercices pour changer leur ordre dans la séance',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '⚡',
    titre: 'Le mode circuit',
    texte: "Crée un circuit depuis \"+ Ajouter un exercice\" en choisissant l'onglet ⚡ Circuit.",
    points: [
      'Configure le nombre de tours et les temps de repos entre exercices',
      'Chaque exercice peut avoir des reps, une durée (gainage...) ou les deux',
      'Repos à 0 seconde = enchaînement direct sans pause',
      'Un timer guide automatiquement entre chaque exercice et entre les tours',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '📝',
    titre: 'Notes sur les exercices',
    texte: "Annote chaque exercice avec des informations personnelles qui restent visibles à chaque séance.",
    points: [
      'Ajoute une note via ✏️ sur la carte de l\'exercice (douleur, prise, sensation...)',
      'La note apparaît dans le drawer ℹ️ pendant la séance',
      'Retrouve et modifie tes notes depuis la page Progression de chaque exercice',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '⏱️',
    titre: 'Le chrono de séance',
    texte: "Démarre manuellement le chrono quand tu es prêt. Il continue de tourner même si tu changes de page ou verrouilles ton téléphone.",
    points: [
      'Pause/Reprendre à tout moment',
      'Le chrono ignore les sessions vieilles de plus de 6h pour éviter les erreurs',
      'À la fin, ajoute une note sur ta séance (douleur, ressenti, PR...)',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '📈',
    titre: 'Le coach automatique',
    texte: "Sur la page de progression de chaque exercice, le coach analyse ton historique et te dit quoi faire à la prochaine séance.",
    points: [
      'Détecte progression, plateau, régression ou besoin de reprise après pause',
      'Te suggère une charge précise pour ta prochaine séance',
      'Définis un objectif de poids par exercice avec une date cible',
    ],
    couleur: '#8B5CF6',
  },
  {
    icon: '🍽️',
    titre: 'Tes repas',
    texte: "Ajoute tes repas depuis le catalogue, les suggestions selon ton objectif, ou en saisie libre.",
    points: [
      'Scanne un code-barres pour récupérer automatiquement les calories et macros',
      'Indique la quantité consommée — les macros se recalculent automatiquement',
      'Modifie un repas déjà ajouté avec le bouton ✏️',
    ],
    couleur: '#22c55e',
  },
  {
    icon: '📊',
    titre: 'Historiques',
    texte: "Deux historiques séparés pour suivre ton évolution dans le temps.",
    points: [
      'Historique des séances : durée, calories (muscu + cardio + circuits), exercices détaillés',
      'Historique nutrition : calories et macros sur 7 ou 30 jours avec graphique',
      'Partage une séance en image stylée vers Instagram ou WhatsApp',
    ],
    couleur: '#3B82F6',
  },
  {
    icon: '👟',
    titre: 'Pas du jour & calories',
    texte: "Connecte Google Fit pour synchroniser automatiquement ton nombre de pas quotidien.",
    points: [
      'Affichage du nombre de pas avec barre de progression vers l\'objectif (8 000 pas)',
      'Les calories estimées par la marche s\'ajoutent à celles de ta séance',
      'Retrouve le total dans ton profil : séance + pas = dépense journalière complète',
    ],
    couleur: '#3B82F6',
  },
  {
    icon: '⚖️',
    titre: 'Ton profil',
    texte: "Suis ton poids, ton IMC et tes calories cibles calculées automatiquement (formule de Mifflin-St Jeor).",
    points: [
      'Calories brûlées = séance + pas Google Fit',
      'Définis un objectif de poids global avec une courbe de trajectoire',
      'Modifie ton profil (âge, sexe, niveau d\'activité, objectif) à tout moment',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '📅',
    titre: 'Le dashboard "Aujourd\'hui"',
    texte: "Un résumé complet de ta journée en un coup d'œil : séance, pas, repas, calories, poids.",
    points: [
      'Séries faites, exercices cardio validés, calories brûlées de la séance',
      'Pas du jour avec estimation de calories (si Google Fit connecté)',
      'Balance calorique : consommé vs objectif journalier',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '🗂️',
    titre: 'Programmes',
    texte: "Crée des programmes d'entraînement réutilisables pour structurer ta semaine.",
    points: [
      'Programmes prêts à l\'emploi (PPL, Full Body, Upper-Lower)',
      'Crée les tiens avec muscu et cardio, jour par jour',
      'Applique un programme en un clic — tes exercices actuels sont remplacés',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '✅',
    titre: "C'est parti !",
    texte: "Tu connais maintenant toutes les fonctionnalités de Fit Tracker. Tu peux revenir consulter ce guide à tout moment depuis ton profil.",
    couleur: '#22c55e',
  },
]

export default function Tutoriel() {
  const router = useRouter()
  const [index, setIndex] = useState(0)

  const slide = SLIDES[index]
  const dernier = index === SLIDES.length - 1
  const premier = index === 0

  function suivant() {
    if (dernier) { router.back(); return }
    setIndex((i) => i + 1)
  }

  function precedent() {
    if (premier) { router.back(); return }
    setIndex((i) => i - 1)
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 5.5rem)' }}>
      {/* Bouton fermer */}
      <div className="flex justify-between items-center pb-4 flex-shrink-0">
        <button onClick={() => router.back()} className="text-sm" style={{ color: 'var(--text-faint)' }}>
          ✕ Fermer
        </button>
        <div className="flex gap-1">
          {SLIDES.map((_, i) => (
            <div key={i} className="rounded-full transition-all"
              style={{
                width: i === index ? '20px' : '6px',
                height: '6px',
                background: i === index ? 'var(--orange)' : 'var(--surface-2)',
              }} />
          ))}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {index + 1}/{SLIDES.length}
        </span>
      </div>

      {/* Contenu du slide */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-1 overflow-y-auto min-h-0">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 flex-shrink-0"
          style={{ background: `${slide.couleur}22` }}>
          {slide.icon}
        </div>

        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
          {slide.titre}
        </h1>

        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: '320px' }}>
          {slide.texte}
        </p>

        {slide.points && (
          <div className="flex flex-col gap-2 w-full pb-2" style={{ maxWidth: '340px' }}>
            {slide.points.map((p, i) => (
              <div key={i} className="card flex items-start gap-2.5 py-2 text-left">
                <span className="text-sm mt-0.5" style={{ color: slide.couleur }}>●</span>
                <p className="text-sm flex-1" style={{ color: 'var(--text)', lineHeight: 1.4 }}>{p}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 pt-3 flex-shrink-0">
        {!premier && (
          <button onClick={precedent}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
            ← Précédent
          </button>
        )}
        <button onClick={suivant}
          className="flex-[2] py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--orange)' }}>
          {dernier ? "C'est compris !" : 'Suivant →'}
        </button>
      </div>
    </div>
  )
}
