import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    // Vérifier que l'utilisateur est connecté
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const clientId = process.env.GOOGLE_FIT_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!clientId || !appUrl) {
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 })
    }

    const redirectUri = `${appUrl}/api/auth/google-fit/callback`
    const scope = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.location.read',
    ].join(' ')

    // Stocker le user_id dans le state pour le retrouver dans le callback
    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64')

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',  // pour obtenir un refresh_token
      prompt: 'consent',        // forcer le consentement pour toujours avoir le refresh_token
      state,
    })

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    return NextResponse.redirect(googleAuthUrl)

  } catch (err) {
    console.error('Google Fit auth error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
