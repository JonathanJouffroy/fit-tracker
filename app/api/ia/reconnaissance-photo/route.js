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
      "confiance": "haute" | "moyenne" | "faible"
    }
  ],
  "total": {
    "kcal": 526,
    "proteines_g": 60,
    "glucides_g": 42,
    "lipides_g": 6
  },
  "note": "Note optionnelle sur la précision ou des éléments difficiles à identifier"
}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
    const json = JSON.parse(texte.replace(/```json|```/g, '').trim())
    return NextResponse.json({ resultat: json })
  } catch (err) {
    console.error('Reconnaissance photo error:', err)
    return NextResponse.json({ error: 'Impossible d\'analyser la photo' }, { status: 500 })
  }
}