'use client'
import { useState, useEffect } from 'react'

// Cache en mémoire pour éviter les appels répétés
const cache = {}

// Table de traduction étendue : nom français → terme de recherche anglais
// Ordre important : du plus spécifique au plus général
const TRADUCTIONS = [
  // Poitrine
  ['développé couché', 'barbell bench press'],
  ['développé incliné', 'incline bench press'],
  ['développé décliné', 'decline bench press'],
  ['développé haltère', 'dumbbell bench press'],
  ['écarté', 'dumbbell fly'],
  ['pec deck', 'pec deck'],
  ['pompe', 'push up'],
  ['push up', 'push up'],
  ['dips', 'chest dip'],

  // Dos
  ['soulevé de terre', 'deadlift'],
  ['deadlift', 'deadlift'],
  ['rowing barre', 'barbell row'],
  ['rowing haltère', 'dumbbell row'],
  ['rowing câble', 'cable row'],
  ['rowing', 'bent over row'],
  ['traction', 'pull up'],
  ['pull up', 'pull up'],
  ['tirage nuque', 'lat pulldown behind head'],
  ['tirage poitrine', 'lat pulldown'],
  ['tirage', 'lat pulldown'],
  ['pull over', 'pullover'],

  // Épaules
  ['développé militaire', 'overhead press'],
  ['développé arnold', 'arnold press'],
  ['développé épaule', 'shoulder press'],
  ['élévation latérale', 'lateral raise'],
  ['élévation frontale', 'front raise'],
  ['oiseau', 'rear delt fly'],
  ['face pull', 'face pull'],
  ['shrug', 'shrug'],
  ['trapèze', 'shrug'],
  ['overhead press', 'overhead press'],

  // Jambes
  ['squat barre', 'barbell squat'],
  ['squat haltère', 'dumbbell squat'],
  ['squat gobelet', 'goblet squat'],
  ['squat', 'squat'],
  ['fente avant', 'forward lunge'],
  ['fente arrière', 'reverse lunge'],
  ['fente', 'lunge'],
  ['leg press', 'leg press'],
  ['presse cuisses', 'leg press'],
  ['leg extension', 'leg extension'],
  ['extension jambe', 'leg extension'],
  ['leg curl', 'leg curl'],
  ['curl jambe', 'leg curl'],
  ['soulevé de terre jambe tendue', 'stiff leg deadlift'],
  ['rdl', 'romanian deadlift'],
  ['romanian', 'romanian deadlift'],
  ['hip thrust', 'hip thrust'],
  ['kick back', 'donkey kickback'],
  ['abduction', 'hip abduction'],
  ['adduction', 'hip adduction'],
  ['hack squat', 'hack squat'],
  ['bulgare', 'bulgarian split squat'],

  // Mollets
  ['mollet', 'calf raise'],
  ['calf', 'calf raise'],
  ['élévation mollet', 'calf raise'],

  // Biceps
  ['curl barre', 'barbell curl'],
  ['curl haltère', 'dumbbell curl'],
  ['curl marteau', 'hammer curl'],
  ['curl câble', 'cable curl'],
  ['curl incliné', 'incline curl'],
  ['curl', 'bicep curl'],
  ['biceps', 'bicep curl'],

  // Triceps
  ['extension triceps barre', 'skull crusher'],
  ['barre au front', 'skull crusher'],
  ['skull crusher', 'skull crusher'],
  ['extension triceps câble', 'tricep pushdown'],
  ['pushdown', 'tricep pushdown'],
  ['extension triceps', 'tricep extension'],
  ['kickback triceps', 'tricep kickback'],
  ['triceps', 'tricep pushdown'],
  ['dips triceps', 'tricep dip'],

  // Abdos
  ['crunch', 'crunch'],
  ['relevé jambes', 'leg raise'],
  ['relevé de jambes', 'leg raise'],
  ['gainage', 'plank'],
  ['plank', 'plank'],
  ['ab wheel', 'ab roller'],
  ['russian twist', 'russian twist'],
  ['abdominaux', 'crunch'],
  ['abdo', 'crunch'],

  // Cardio machine
  ['rameur', 'rowing'],
  ['elliptique', 'elliptical'],
  ['vélo', 'cycling'],
  ['tapis', 'treadmill'],
]

// Cherche la meilleure traduction pour un nom d'exercice
function traduire(nom) {
  const nomLower = nom.toLowerCase().trim()

  // Cherche la correspondance la plus longue (la plus spécifique)
  let meilleure = null
  let longueurMax = 0

  for (const [fr, en] of TRADUCTIONS) {
    if (nomLower.includes(fr) && fr.length > longueurMax) {
      meilleure = en
      longueurMax = fr.length
    }
  }

  return meilleure || nomLower // fallback : nom tel quel (ExerciseDB fait une recherche floue)
}

export function useExerciceGif(nomExercice) {
  const [gif, setGif] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!nomExercice) return
    const cle = nomExercice.toLowerCase().trim()
    if (cache[cle] !== undefined) {
      setGif(cache[cle])
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_EXERCISEDB_KEY
    if (!apiKey) return

    setLoading(true)
    setErreur(false)

    const termeEn = traduire(nomExercice)
    const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(termeEn)}?limit=1`

    fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const exo = data[0]
          const result = {
            gif: exo.gifUrl,
            muscles: [exo.target, ...(exo.secondaryMuscles || [])].filter(Boolean),
            nomEn: exo.name,
          }
          cache[cle] = result
          setGif(result)
        } else {
          // Pas de résultat avec la traduction → essai avec le nom brut
          if (termeEn !== nomExercice.toLowerCase().trim()) {
            const urlFallback = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(nomExercice)}?limit=1`
            return fetch(urlFallback, {
              headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
              },
            }).then(r => r.json()).then(data2 => {
              if (Array.isArray(data2) && data2.length > 0) {
                const exo = data2[0]
                const result = {
                  gif: exo.gifUrl,
                  muscles: [exo.target, ...(exo.secondaryMuscles || [])].filter(Boolean),
                  nomEn: exo.name,
                }
                cache[cle] = result
                setGif(result)
              } else {
                cache[cle] = null
                setGif(null)
              }
            })
          } else {
            cache[cle] = null
            setGif(null)
          }
        }
      })
      .catch(() => {
        setErreur(true)
      })
      .finally(() => setLoading(false))
  }, [nomExercice])

  return { gif, loading, erreur }
}
