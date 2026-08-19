import { NextResponse } from 'next/server'
import { parseGroqJson } from '@/lib/parseGroqJson'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { ingredients, objectifLabel, typeLabel, caloriesRestantes, profil } = await request.json()
    if (!ingredients?.trim()) return NextResponse.json({ error: 'Ingrédients manquants' }, { status: 400 })

    const prompt = `Tu es un nutritionniste expert. L'utilisateur a les ingrédients suivants dans son frigo : "${ingredients}".

Son objectif est : ${objectifLabel}.
Type de repas : ${typeLabel}.
${caloriesRestantes !== null ? `Calories restantes aujourd'hui : ${Math.round(caloriesRestantes)} kcal.` : ''}
${profil ? `Profil : ${profil.sexe}, ${profil.age} ans, objectif ${profil.objectif}.` : ''}

Propose exactement 3 recettes simples et rapides à faire avec ces ingrédients (tu peux supposer des condiments de base : sel, poivre, huile, ail, oignon). Pour chaque recette, donne une estimation précise des macros ET les quantités de chaque ingrédient.

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown :
[
  {
    "nom": "Nom du repas",
    "description": "Description courte (1 phrase)",
    "kcal": 450,
    "proteines": 35,
    "glucides": 40,
    "lipides": 12,
    "temps": "15 min",
    "ingredients_utilises": [
      { "nom": "Poulet", "quantite": "150g" },
      { "nom": "Riz", "quantite": "80g cru" },
      { "nom": "Brocolis", "quantite": "200g" },
      { "nom": "Huile d'olive", "quantite": "1 c.à.s" }
    ],
    "etapes": ["Étape 1", "Étape 2", "Étape 3"]
  }
]`

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.error('GROQ_API_KEY manquante')
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'Tu es un nutritionniste expert. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq API error:', res.status, err)
      return NextResponse.json({ error: 'Erreur API Groq: ' + res.status }, { status: 500 })
    }

    const data = await res.json()
    const texte = data.choices?.[0]?.message?.content || ''
    const json = parseGroqJson(texte)
    return NextResponse.json({ suggestions: json })
  } catch (err) {
    console.error('Suggestions repas error:', err)
    return NextResponse.json({ error: 'Impossible de générer des suggestions' }, { status: 500 })
  }
}
