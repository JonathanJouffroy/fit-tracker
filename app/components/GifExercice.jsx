'use client'
import { useState } from 'react'

// Descriptions techniques intégrées pour les exercices courants
// Pas de dépendance API externe
const TECHNIQUES = {
  'squat': { muscles: 'Quadriceps, fessiers, ischios', etapes: ['Pieds écartés largeur épaules, orteils légèrement tournés', 'Descends en poussant les genoux vers les orteils, dos droit', 'Descends jusqu\'aux cuisses parallèles au sol', 'Remonte en poussant dans les talons'] },
  'squat barre': { muscles: 'Quadriceps, fessiers, ischios', etapes: ['Barre posée sur les trapèzes, pas sur le cou', 'Pieds largeur épaules, orteils à 30°', 'Descends contrôlé, genoux alignés avec les pieds', 'Remonte en expirant, hanches et épaules ensemble'] },
  'développé couché': { muscles: 'Pectoraux, triceps, deltoïdes antérieurs', etapes: ['Allongé, pieds à plat, dos légèrement cambré', 'Prise légèrement plus large que les épaules', 'Descends la barre vers le bas des pectoraux', 'Pousse en arc de cercle vers le haut'] },
  'développé militaire': { muscles: 'Deltoïdes, triceps, trapèzes', etapes: ['Debout ou assis, barre à hauteur de clavicules', 'Gainage abdominal, dos droit', 'Pousse la barre droit au-dessus de la tête', 'Passe la tête à travers les bras en haut'] },
  'soulevé de terre': { muscles: 'Ischios, fessiers, dos, trapèzes', etapes: ['Pieds sous la barre, largeur hanches', 'Saisir la barre, dos plat, poitrine haute', 'Pousser le sol vers le bas en gardant la barre proche du corps', 'Hanches et épaules montent ensemble, verrouiller en haut'] },
  'rowing barre': { muscles: 'Dos, biceps, trapèzes', etapes: ['Buste penché à 45°, dos plat', 'Tirer la barre vers le bas du ventre', 'Coudes le long du corps, serrer les omoplates', 'Redescendre contrôlé'] },
  'traction': { muscles: 'Grand dorsal, biceps, trapèzes', etapes: ['Prise pronation légèrement plus large que les épaules', 'Partir bras tendus, épaules basses', 'Tirer les coudes vers les hanches', 'Menton au-dessus de la barre, descendre contrôlé'] },
  'tirage': { muscles: 'Grand dorsal, biceps, trapèzes', etapes: ['Assis, poitrine haute, légèrement penché en arrière', 'Tirer la barre vers le haut des pectoraux', 'Coudes vers le bas et l\'arrière', 'Contrôler la remontée'] },
  'curl biceps': { muscles: 'Biceps, avant-bras', etapes: ['Debout, bras le long du corps', 'Fléchir les coudes en gardant les épaules fixes', 'Monter jusqu\'à la contraction maximale', 'Redescendre lentement'] },
  'curl marteau': { muscles: 'Biceps, brachioradial', etapes: ['Prise neutre (paumes face à face)', 'Fléchir les coudes sans rotation du poignet', 'Monter jusqu\'au menton', 'Redescendre contrôlé'] },
  'extension triceps': { muscles: 'Triceps', etapes: ['Bras tendus au-dessus de la tête', 'Fléchir seulement les coudes, coudes fixes', 'Descendre derrière la nuque', 'Étendre les bras en expirant'] },
  'élévation latérale': { muscles: 'Deltoïdes latéraux', etapes: ['Debout, haltères le long du corps', 'Lever les bras à l\'horizontale, légèrement fléchis', 'Poignets légèrement plus bas que les coudes', 'Redescendre contrôlé, 3-4 secondes'] },
  'leg press': { muscles: 'Quadriceps, fessiers, ischios', etapes: ['Dos bien plaqué contre le dossier', 'Pieds largeur épaules, à mi-hauteur de la plateforme', 'Descendre jusqu\'à 90° de flexion', 'Pousser sans verrouiller les genoux'] },
  'leg curl': { muscles: 'Ischios, mollets', etapes: ['Allongé face contre terre, chevilles sous le rouleau', 'Fléchir les genoux en gardant les hanches plaquées', 'Monter jusqu\'à 90°, contraction en haut', 'Redescendre lentement'] },
  'fente': { muscles: 'Quadriceps, fessiers, ischios', etapes: ['Pied avant à un grand pas devant', 'Descends verticalement, genou arrière vers le sol', 'Genou avant aligné avec le pied, pas en avant', 'Pousser sur le pied avant pour revenir'] },
  'hip thrust': { muscles: 'Fessiers, ischios', etapes: ['Dos appuyé sur un banc à hauteur des omoplates', 'Barre posée sur les hanches, pieds à plat', 'Pousser les hanches vers le haut en contractant les fessiers', 'Corps horizontal en haut, redescendre contrôlé'] },
  'crunch': { muscles: 'Abdominaux', etapes: ['Allongé, genoux fléchis, mains derrière la nuque', 'Décoller les épaules sans tirer sur le cou', 'Expirer en montant, contraction des abdos', 'Redescendre sans toucher le sol'] },
  'gainage': { muscles: 'Core, abdominaux, lombaires', etapes: ['Appui sur avant-bras et orteils', 'Corps droit de la tête aux pieds', 'Contraction abdominale constante', 'Respirer normalement, maintenir la position'] },
  'mollet': { muscles: 'Mollets (gastrocnémiens, soléaire)', etapes: ['Debout, pointe des pieds sur un step', 'Monter sur la pointe des pieds en expirant', 'Maintenir 1 seconde en haut', 'Descendre sous le niveau du step pour l\'étirement'] },
  'dips': { muscles: 'Triceps, pectoraux, deltoïdes', etapes: ['Bras tendus sur les barres parallèles', 'Descendre en fléchissant les coudes', 'Coudes proches du corps pour les triceps, penchés pour les pectoraux', 'Pousser vers le haut sans verrouiller'] },
  'développé incliné': { muscles: 'Pectoraux supérieurs, triceps', etapes: ['Banc à 30-45°, barre au niveau du haut des pectoraux', 'Prise légèrement plus large que les épaules', 'Descendre vers le haut de la poitrine', 'Pousser vers le haut en arc'] },
}

function trouverTechnique(nom) {
  const nomLower = nom.toLowerCase()
  // Correspondance exacte d'abord
  if (TECHNIQUES[nomLower]) return TECHNIQUES[nomLower]
  // Puis partielle (du plus long au plus court)
  const cles = Object.keys(TECHNIQUES).sort((a, b) => b.length - a.length)
  for (const cle of cles) {
    if (nomLower.includes(cle)) return TECHNIQUES[cle]
  }
  return null
}

function lienYoutube(nom) {
  const terme = encodeURIComponent(`${nom} technique tutoriel`)
  return `https://www.youtube.com/results?search_query=${terme}`
}

export default function GifExercice({ nomExercice }) {
  const [visible, setVisible] = useState(false)
  const technique = trouverTechnique(nomExercice)

  if (!visible) {
    return (
      <button onClick={() => setVisible(true)}
        className="mt-1 text-xs flex items-center gap-1"
        style={{ color: 'var(--text-faint)' }}>
        <span>▶</span> Voir la technique
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)' }}>
      <div className="flex justify-between items-center px-3 py-2">
        <p className="text-xs font-semibold" style={{ color: 'var(--orange)' }}>Technique — {nomExercice}</p>
        <button onClick={() => setVisible(false)} className="text-xs" style={{ color: 'var(--text-faint)' }}>✕</button>
      </div>

      {technique ? (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            💪 {technique.muscles}
          </p>
          <ol className="flex flex-col gap-1.5">
            {technique.etapes.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--orange)', color: 'white', fontSize: '9px' }}>
                  {i + 1}
                </span>
                {e}
              </li>
            ))}
          </ol>
          <a href={lienYoutube(nomExercice)} target="_blank" rel="noopener noreferrer"
            className="mt-1 text-xs flex items-center gap-1 underline"
            style={{ color: '#FF0000' }}>
            ▶ Voir une démonstration vidéo sur YouTube
          </a>
        </div>
      ) : (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Pas de fiche technique pour cet exercice.
          </p>
          <a href={lienYoutube(nomExercice)} target="_blank" rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 underline"
            style={{ color: '#FF0000' }}>
            ▶ Chercher une démonstration sur YouTube
          </a>
        </div>
      )}
    </div>
  )
}
