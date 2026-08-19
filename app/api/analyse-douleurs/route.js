import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { douleurs } = await request.json()
    if (!douleurs?.length) return NextResponse.json({ analyse: null })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

    const ZONES_FR = {
      epaule: 'épaule', coude: 'coude', poignet: 'poignet',
      dos_haut: 'dos (haut)', dos_bas: 'dos (bas)', hanche: 'hanche',
      genou: 'genou', cheville: 'cheville', autre: 'autre zone'
    }

    const resume = douleurs.map(d =>
      `- ${d.date_seance} : ${ZONES_FR[d.zone] || d.zone}, intensité ${d.intensite}${d.note ? ` (${d.note})` : ''}`
    ).join('\n')

    const prompt = `Tu es un coach sportif expert en prévention des blessures. Voici l'historique des douleurs notées par un sportif lors de ses séances :

${resume}

Analyse ces données et réponds en JSON valide uniquement, sans texte avant ou après :
{
  "patterns": ["pattern 1 détecté", "pattern 2 détecté"],
  "zones_a_risque": ["zone1", "zone2"],
  "recommandations": ["recommandation 1", "recommandation 2", "recommandation 3"],
  "niveau_alerte": "faible" | "modere" | "eleve",
  "message": "Message personnalisé court et bienveillant (2-3 phrases max)"
}

Sois concret, bienveillant et prudent. Si la douleur est forte ou répétée, suggère de consulter un professionnel. Ne remplace pas un médecin.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        max_tokens: 800,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'Tu es un coach sportif expert. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!res.ok) return NextResponse.json({ analyse: null })

    const data = await res.json()
    const texte = data.choices?.[0]?.message?.content || ''
    const json = JSON.parse(texte.replace(/```json|```/g, '').trim())
    return NextResponse.json({ analyse: json })
  } catch (err) {
    console.error('Analyse douleurs error:', err)
    return NextResponse.json({ analyse: null })
  }
}
