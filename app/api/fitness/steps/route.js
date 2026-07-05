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

    // Interroger toutes les sources de pas raw disponibles
    const sourcesResponse = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataSources',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    let totalPas = 0

    if (sourcesResponse.ok) {
      const sources = await sourcesResponse.json()
      // Toutes les sources de pas delta (raw et derived utiles)
      const stepSources = sources.dataSource?.filter(s =>
        s.dataType?.name === 'com.google.step_count.delta'
      ).map(s => s.dataStreamId) || []

      console.log('Sources trouvées:', stepSources.length)

      const startNs = BigInt(startTimeMillis) * BigInt(1000000)
      const endNs = BigInt(endTimeMillis) * BigInt(1000000)
      console.log('startNs:', startNs.toString(), 'endNs:', endNs.toString())

      // Lire toutes les sources en parallèle
      const results = await Promise.all(
        stepSources.map(sourceId =>
          fetch(
            `https://www.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(sourceId)}/datasets/${startNs}-${endNs}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          ).then(r => r.ok ? r.json() : null).catch(() => null)
        )
      )

      // Trouver la source avec le plus de pas (évite les doublons d'agrégation)
      let maxPas = 0
      const parSource = {}
      results.forEach((data, i) => {
        if (!data) return
        let count = 0
        data.point?.forEach(point => {
          point.value?.forEach(val => { count += val.intVal || 0 })
        })
        if (count > 0 || data.point?.length > 0) {
          console.log(`${stepSources[i]}: ${count} pas, ${data.point?.length} points`)
          if (data.point?.length > 0) console.log('Premier point:', JSON.stringify(data.point[0]))
        } else {
          // Logger même les sources vides pour voir la structure
          console.log(`VIDE: ${stepSources[i]}`, JSON.stringify(data).slice(0, 150))
        }
        if (count > 0) {
          parSource[stepSources[i]] = count
        }
      })

      // Utiliser merge_step_deltas si disponible (évite doublons),
      // sinon prendre la source avec le max de pas
      const mergeSource = 'derived:com.google.step_count.delta:com.google.android.gms:merge_step_deltas'
      if (parSource[mergeSource]) {
        totalPas = parSource[mergeSource]
      } else {
        totalPas = Math.max(0, ...Object.values(parSource))
      }
    }

    console.log('Total pas final:', totalPas)

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
