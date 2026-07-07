import { NextResponse } from 'next/server'
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

Propose exactement 3 recettes simples et rapides à faire avec ces ingrédients (tu peux supposer des condiments de base : sel, poivre, huile, ail, oignon). Pour chaque recette, donne une estimation des macros.

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
    "ingredients_utilises": ["ingrédient1", "ingrédient2"],
    "etapes": ["Étape 1", "Étape 2", "Étape 3"]
  }
]`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Anthropic API error:', err)
      return NextResponse.json({ error: 'Erreur API' }, { status: 500 })
    }

    const data = await res.json()
    const texte = data.content?.[0]?.text || ''
    const json = JSON.parse(texte.replace(/```json|```/g, '').trim())
    return NextResponse.json({ suggestions: json })
  } catch (err) {
    console.error('Suggestions repas error:', err)
    return NextResponse.json({ error: 'Impossible de générer des suggestions' }, { status: 500 })
  }
}
