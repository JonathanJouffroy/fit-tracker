import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { repas, profil, caloriesCible } = await request.json()

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

    // Résumer les repas par fréquence
    const frequence = {}
    repas.forEach(r => {
      const nom = r.nom || 'Repas inconnu'
      frequence[nom] = (frequence[nom] || 0) + 1
    })
    const repasFrequents = Object.entries(frequence)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([nom, n]) => `${nom} (×${n})`)
      .join(', ')

    const objectifLabel = {
      perte_poids: 'perte de poids (déficit calorique, beaucoup de protéines et légumes, peu de glucides)',
      maintien: 'maintien du poids (équilibre macros)',
      prise_masse: 'prise de masse (surplus calorique, beaucoup de protéines et glucides complexes)',
    }[profil?.objectif] || 'alimentation équilibrée'

    const prompt = `Tu es un nutritionniste expert. Génère une liste de courses pour 7 jours pour une personne avec les informations suivantes :

Objectif : ${objectifLabel}
${caloriesCible ? `Objectif calorique journalier : ${Math.round(caloriesCible)} kcal/jour` : ''}
${profil?.sexe ? `Sexe : ${profil.sexe}` : ''}
${profil?.poids_kg ? `Poids : ${profil.poids_kg}kg` : ''}

Repas habituels des dernières semaines (par fréquence) : ${repasFrequents || 'Non renseigné'}

Génère une liste de courses réaliste, équilibrée et adaptée à l'objectif. Inclus des quantités précises pour 7 jours pour 1 personne.

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{
  "categories": [
    {
      "nom": "Viandes & Protéines",
      "emoji": "🥩",
      "articles": [
        { "nom": "Blanc de poulet", "quantite": "800g", "conseil": "Base protéique principale" },
        { "nom": "Œufs", "quantite": "12", "conseil": null }
      ]
    },
    {
      "nom": "Poissons",
      "emoji": "🐟",
      "articles": [...]
    },
    {
      "nom": "Féculents",
      "emoji": "🌾",
      "articles": [...]
    },
    {
      "nom": "Légumes",
      "emoji": "🥦",
      "articles": [...]
    },
    {
      "nom": "Fruits",
      "emoji": "🍎",
      "articles": [...]
    },
    {
      "nom": "Produits laitiers",
      "emoji": "🥛",
      "articles": [...]
    },
    {
      "nom": "Corps gras & Condiments",
      "emoji": "🫒",
      "articles": [...]
    }
  ],
  "budget_estime": "45-55€",
  "conseil_semaine": "Conseil personnalisé court basé sur l'objectif (1-2 phrases)"
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        max_tokens: 2000,
        temperature: 0.4,
        messages: [
          { role: 'system', content: 'Tu es un nutritionniste expert. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après, sans balises markdown.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq error:', res.status, err)
      return NextResponse.json({ error: 'Erreur API' }, { status: 500 })
    }

    const data = await res.json()
    const texte = data.choices?.[0]?.message?.content || ''
    const json = JSON.parse(texte.replace(/```json|```/g, '').trim())
    return NextResponse.json({ liste: json })
  } catch (err) {
    console.error('Liste courses error:', err)
    return NextResponse.json({ error: 'Impossible de générer la liste' }, { status: 500 })
  }
}
