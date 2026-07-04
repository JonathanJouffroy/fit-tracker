import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Rafraîchit le access_token si expiré
async function rafraichirToken(integration, supabase) {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET

  if (!integration.refresh_token || !clientId || !clientSecret) {
    return null
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: integration.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) return null

  const tokens = await response.json()
  if (!tokens.access_token) return null

  const tokenExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()

  // Mettre à jour le token en base
  await supabase.from('integrations').update({
    access_token: tokens.access_token,
    token_expiry: tokenExpiry,
    updated_at: new Date().toISOString(),
  }).eq('user_id', integration.user_id)

  return tokens.access_token
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer l'intégration Google Fit
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google_fit')
      .single()

    if (intError || !integration) {
      return NextResponse.json({ connected: false }, { status: 200 })
    }

    // Vérifier si le token est expiré (avec 5min de marge)
    let accessToken = integration.access_token
    const expiry = new Date(integration.token_expiry)
    const maintenant = new Date()
    const margeMs = 5 * 60 * 1000

    if (expiry.getTime() - maintenant.getTime() < margeMs) {
      accessToken = await rafraichirToken(integration, supabase)
      if (!accessToken) {
        return NextResponse.json({ connected: false, needsReauth: true }, { status: 200 })
      }
    }

    // Définir la plage horaire du jour (minuit → maintenant)
    const maintenant2 = new Date()
    const debutJour = new Date(maintenant2)
    debutJour.setHours(0, 0, 0, 0)

    const startTimeMillis = debutJour.getTime()
    const endTimeMillis = maintenant2.getTime()

    // Appel Google Fit API — agrégation des pas sur la journée
    const fitResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
          }],
          bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
          startTimeMillis,
          endTimeMillis,
        }),
      }
    )

    if (!fitResponse.ok) {
      const err = await fitResponse.text()
      console.error('Google Fit API error:', err)
      return NextResponse.json({ connected: true, pas: null, error: 'API error' }, { status: 200 })
    }

    const fitData = await fitResponse.json()

    // Extraire le nombre de pas
    let totalPas = 0
    fitData.bucket?.forEach((bucket) => {
      bucket.dataset?.forEach((dataset) => {
        dataset.point?.forEach((point) => {
          point.value?.forEach((val) => {
            totalPas += val.intVal || 0
          })
        })
      })
    })

    return NextResponse.json({
      connected: true,
      pas: totalPas,
      date: maintenant2.toISOString().split('T')[0],
    })

  } catch (err) {
    console.error('Fitness steps error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Déconnecter Google Fit
export async function DELETE() {
  try {
    const supabase = createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    await supabase.from('integrations').delete().eq('user_id', user.id).eq('provider', 'google_fit')
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Disconnect error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
