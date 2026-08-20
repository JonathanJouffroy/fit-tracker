import { NextResponse } from 'next/server'
import { parseGroqJson } from '@/lib/parseGroqJson'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { donnees } = await request.json()

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

    const prompt = `Tu es un coach sportif et nutritionniste expert. Voici les données de la semaine dernière d'un sportif :

SÉANCES :
- Nombre de séances : ${donnees.seances.nombre}
- Durée totale : ${donnees.seances.dureeTotal} minutes
- Exercices les plus faits : ${donnees.seances.exercices.join(', ') || 'aucun'}
- Volume total : ${donnees.seances.volume}kg

NUTRITION :
- Jours avec repas enregistrés : ${donnees.nutrition.joursEnregistres}/7
- Moyenne calorique journalière : ${donnees.nutrition.moyenneKcal} kcal
- Objectif calorique : ${donnees.nutrition.objectifKcal} kcal/jour
- Protéines moyennes : ${donnees.nutrition.moyenneProteines}g/jour

PAS :
- Moyenne journalière : ${donnees.pas.moyenne} pas
- Objectif : ${donnees.pas.objectif} pas
- Jours avec objectif atteint : ${donnees.pas.joursObjectifAtteint}/7

DOULEURS NOTÉES :
${donnees.douleurs.length > 0
  ? donnees.douleurs.map(d => `- ${d.zone} (${d.intensite})${d.note ? ': ' + d.note : ''}`).join('\n')
  : '- Aucune douleur notée cette semaine 🎉'}

OBJECTIF GÉNÉRAL : ${donnees.objectif}

Génère un bilan hebdomadaire personnalisé, bienveillant et motivant. Réponds UNIQUEMENT en JSON valide :
{
  "titre": "Titre accrocheur de la semaine (ex: Semaine solide ! 💪)",
  "note_globale": 7,
  "resume": "Résumé court et personnalisé en 2 phrases max",
  "sections": [
    {
      "emoji": "🏋️",
      "titre": "Séances",
      "contenu": "Analyse des séances en 1-2 phrases",
      "statut": "bien" | "moyen" | "attention"
    },
    {
      "emoji": "🍽️",
      "titre": "Nutrition",
      "contenu": "Analyse de la nutrition en 1-2 phrases",
      "statut": "bien" | "moyen" | "attention"
    },
    {
      "emoji": "👟",
      "titre": "Activité",
      "contenu": "Analyse des pas en 1-2 phrases",
      "statut": "bien" | "moyen" | "attention"
    }
  ],
  "recommandations": [
    "Recommandation concrète et actionnable 1",
    "Recommandation concrète et actionnable 2",
    "Recommandation concrète et actionnable 3"
  ],
  "point_fort": "Le point fort de la semaine en 1 phrase",
  "point_ameliorer": "Le principal point à améliorer la semaine prochaine en 1 phrase"
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        max_tokens: 1000,
        temperature: 0.4,
        messages: [
          { role: 'system', content: 'Tu es un coach sportif expert. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq bilan error:', res.status, err)
      return NextResponse.json({ error: 'Erreur API' }, { status: 500 })
    }

    const data = await res.json()
    const texte = data.choices?.[0]?.message?.content || ''
    const json = parseGroqJson(texte)
    return NextResponse.json({ bilan: json })
  } catch (err) {
    console.error('Bilan hebdo error:', err)
    return NextResponse.json({ error: 'Impossible de générer le bilan' }, { status: 500 })
  }
}
