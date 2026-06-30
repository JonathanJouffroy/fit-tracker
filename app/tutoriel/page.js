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
    texte: "Sur l'onglet Séances, planifie tes exercices jour par jour. Tu peux ajouter de la musculation (séries/reps/poids) ou du cardio (natation, course, vélo, marche, randonnée, elliptique, rameur, corde à sauter).",
    points: [
      'Chaque exercice cardio a ses propres métriques (distance, dénivelé, allure)',
      'Tu peux faire 2 séances le même jour — le chrono te propose de reprendre ou recommencer',
      'Les séries restent modifiables même après les avoir toutes complétées',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '⏱️',
    titre: 'Le chrono de séance',
    texte: "Démarre manuellement le chrono quand tu es prêt. Il continue de tourner même si tu changes de page ou verrouilles ton téléphone.",
    points: [
      'Pause/Reprendre à tout moment',
      'À la fin, ajoute une note sur ta séance (douleur, ressenti, PR...)',
      'La durée est sauvegardée et visible dans ton historique',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '📈',
    titre: 'Le coach automatique',
    texte: "Sur la page de progression de chaque exercice, le coach analyse ton historique et te dit quoi faire à la prochaine séance.",
    points: [
      'Détecte progression, plateau, régression ou besoin de reprise',
      'Te suggère une charge précise pour ta prochaine séance',
      'Définis un objectif de poids par exercice avec une date — le coach te dit si tu es en avance ou en retard',
    ],
    couleur: '#8B5CF6',
  },
  {
    icon: '🍽️',
    titre: 'Tes repas',
    texte: "Ajoute tes repas depuis le catalogue, les suggestions personnalisées selon ton objectif, ou en saisie libre.",
    points: [
      'Scanne un code-barres pour récupérer automatiquement les calories et macros',
      'Indique la quantité réellement consommée — les macros se recalculent toutes seules',
      "Modifie un repas déjà ajouté avec le bouton ✏️",
    ],
    couleur: '#22c55e',
  },
  {
    icon: '📊',
    titre: 'Historiques',
    texte: "Deux historiques séparés pour suivre ton évolution dans le temps.",
    points: [
      'Historique des séances : durée, calories, exercices détaillés par jour',
      'Historique nutrition : calories et macros sur 7 ou 30 jours, avec graphique',
    ],
    couleur: '#3B82F6',
  },
  {
    icon: '📤',
    titre: 'Partage Instagram',
    texte: "Depuis l'historique des séances, ouvre une séance et clique sur \"Partager la séance\".",
    points: [
      'Génère une image stylée avec tes stats, exercices et calories',
      'Affiche une silhouette montrant les zones musculaires travaillées',
      'Partage directement vers Instagram, WhatsApp ou télécharge en PNG',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '⚖️',
    titre: 'Ton profil',
    texte: "Suis ton poids, ton IMC et tes calories cibles calculées automatiquement (formule de Mifflin-St Jeor).",
    points: [
      'Définis un objectif de poids global avec une courbe de trajectoire',
      'Visualise tes calories consommées vs brûlées chaque jour',
      'Modifie ton profil (âge, niveau d\'activité, objectif) à tout moment',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '📅',
    titre: 'Le dashboard "Aujourd\'hui"',
    texte: "Un résumé complet de ta journée en un coup d'œil : séance, repas, calories, poids.",
    points: [
      "Vue d'ensemble rapide sans naviguer entre les pages",
      'Accessible depuis le premier onglet de la navigation',
    ],
    couleur: '#FF5722',
  },
  {
    icon: '🗂️',
    titre: 'Programmes',
    texte: "Crée des programmes d'entraînement réutilisables pour structurer ta semaine.",
    points: [
      'Programmes prêts à l\'emploi (PPL, Full Body, Upper-Lower)',
      'Crée les tiens, jour par jour, avec muscu et cardio',
      'Applique un programme en un clic pour remplacer ta semaine',
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

      {/* Contenu du slide — scrollable si besoin, ne pousse pas les boutons */}
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

      {/* Navigation — toujours visible en bas, jamais poussée par le contenu */}
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
