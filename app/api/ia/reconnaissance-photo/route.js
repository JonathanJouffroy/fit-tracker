import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { imageBase64, mimeType } = await request.json()
    if (!imageBase64) return NextResponse.json({ error: 'Image manquante' }, { status: 400 })

    const apiKey = process.env.GOOGLE_AI_KEY
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

    const prompt = `Tu es un nutritionniste expert en analyse visuelle d'aliments. Analyse cette photo d'assiette ou de repas.

Identifie chaque aliment visible, estime les quantités visuellement (en grammes), et calcule les macros.

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{
  "description": "Description courte de l'assiette (1 phrase)",
  "aliments": [
    {
      "nom": "Blanc de poulet grillé",
      "quantite_g": 180,
      "kcal": 297,
      "proteines_g": 56,
      "glucides_g": 0,
      "lipides_g": 5,
      "confiance": "haute"
    }
  ],
  "total": {
    "kcal": 526,
    "proteines_g": 60,
    "glucides_g": 42,
    "lipides_g": 6
  },
  "note": "Note optionnelle"
}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Gemini error:', res.status, err)
      return NextResponse.json({ error: 'Erreur API Gemini' }, { status: 500 })
    }

    const data = await res.json()
    const texte = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('Gemini raw response:', texte.slice(0, 200))

    const match = texte.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Pas de JSON dans la réponse')
    const json = JSON.parse(match[0])
    return NextResponse.json({ resultat: json })
  } catch (err) {
    console.error('Reconnaissance photo error:', err)
    return NextResponse.json({ error: 'Impossible d\'analyser la photo' }, { status: 500 })
  }
}