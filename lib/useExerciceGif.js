'use client'
import { useState, useEffect } from 'react'

// Cache en mémoire pour éviter les appels répétés pendant la session
const cache = {}

// Traduit les noms d'exercices français → anglais pour la recherche
const TRADUCTIONS = {
  'squat': 'squat',
  'squat barre': 'barbell squat',
  'fente': 'lunge',
  'soulevé de terre': 'deadlift',
  'développé couché': 'bench press',
  'développé militaire': 'overhead press',
  'rowing barre': 'barbell row',
  'rowing haltère': 'dumbbell row',
  'traction': 'pull up',
  'tirage': 'lat pulldown',
  'curl biceps': 'bicep curl',
  'curl haltère': 'dumbbell curl',
  'curl marteau': 'hammer curl',
  'triceps poulie': 'tricep pushdown',
  'extension triceps': 'tricep extension',
  'dips': 'dips',
  'pompes': 'push up',
  'développé incliné': 'incline bench press',
  'élévation latérale': 'lateral raise',
  'leg press': 'leg press',
  'leg curl': 'leg curl',
  'leg extension': 'leg extension',
  'mollet': 'calf raise',
  'hip thrust': 'hip thrust',
  'gainage': 'plank',
  'crunch': 'crunch',
  'abdo': 'crunch',
  'relevé de jambes': 'leg raise',
  'rameur': 'rowing machine',
}

function traduire(nom) {
  const nomLower = nom.toLowerCase().trim()
  // Cherche une correspondance exacte ou partielle
  for (const [fr, en] of Object.entries(TRADUCTIONS)) {
    if (nomLower.includes(fr)) return en
  }
  return nomLower // fallback : utilise le nom tel quel
}

export function useExerciceGif(nomExercice) {
  const [gif, setGif] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!nomExercice) return
    const cle = nomExercice.toLowerCase().trim()
    if (cache[cle]) { setGif(cache[cle]); return }

    const apiKey = process.env.NEXT_PUBLIC_EXERCISEDB_KEY
    if (!apiKey) return // pas de clé configurée → pas de GIF

    setLoading(true)
    const terme = encodeURIComponent(traduire(nomExercice))

    fetch(`https://exercisedb.p.rapidapi.com/exercises/name/${terme}?limit=1`, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
      },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const result = {
            gif: data[0].gifUrl,
            muscles: data[0].target ? [data[0].target, ...(data[0].secondaryMuscles || [])] : [],
          }
          cache[cle] = result
          setGif(result)
        }
      })
      .catch(() => {}) // silencieux si l'API est indisponible
      .finally(() => setLoading(false))
  }, [nomExercice])

  return { gif, loading }
}
