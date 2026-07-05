import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
    const supabase = await createServerSupabaseClient()

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

    // Debug : lister toutes les sources disponibles
    const sourcesResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataSources',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (sourcesResponse.ok) {
      const sources = await sourcesResponse.json()
      const stepSources = sources.dataSource?.filter(s =>
        s.dataType?.name?.includes('step') || s.dataStreamId?.includes('step')
      )
      console.log('Step sources:', JSON.stringify(stepSources?.map(s => s.dataStreamId)))
    }

    // Appel Google Fit API — deux requêtes en parallèle pour couvrir toutes les sources
    const bodyAggregate = JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
      bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
      startTimeMillis,
      endTimeMillis,
    })

    const [fitResponse1, fitResponse2] = await Promise.all([
      fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: bodyAggregate,
      }),
      // Source alternative : estimated_steps directement
      fetch(`https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.step_count.delta:com.google.android.gms:estimated_steps/datasets/${startTimeMillis}000000-${endTimeMillis}000000`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ])

    let totalPas = 0

    if (fitResponse1.ok) {
      const fitData = await fitResponse1.json()
      console.log('Aggregate raw:', JSON.stringify(fitData).slice(0, 300))
      fitData.bucket?.forEach((bucket) => {
        bucket.dataset?.forEach((dataset) => {
          dataset.point?.forEach((point) => {
            point.value?.forEach((val) => { totalPas += val.intVal || 0 })
          })
        })
      })
    }

    // Si pas de résultat depuis aggregate, essayer la source directe
    if (totalPas === 0 && fitResponse2.ok) {
      const fitData2 = await fitResponse2.json()
      console.log('Direct source raw:', JSON.stringify(fitData2).slice(0, 300))
      fitData2.point?.forEach((point) => {
        point.value?.forEach((val) => { totalPas += val.intVal || 0 })
      })
    }

    console.log('Total pas:', totalPas)

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
    const supabase = await createServerSupabaseClient()
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
