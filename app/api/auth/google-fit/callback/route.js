import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    // L'utilisateur a refusé l'autorisation
    if (errorParam) {
      return NextResponse.redirect(`${appUrl}/dashboard?google_fit=denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/dashboard?google_fit=error`)
    }

    // Décoder le state pour récupérer le userId
    let userId
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
      userId = decoded.userId
    } catch {
      return NextResponse.redirect(`${appUrl}/dashboard?google_fit=error`)
    }

    if (!userId) {
      return NextResponse.redirect(`${appUrl}/dashboard?google_fit=error`)
    }

    const clientId = process.env.GOOGLE_FIT_CLIENT_ID
    const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET
    const redirectUri = `${appUrl}/api/auth/google-fit/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${appUrl}/dashboard?google_fit=error`)
    }

    // Échanger le code contre les tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text()
      console.error('Token exchange error:', err)
      return NextResponse.redirect(`${appUrl}/dashboard?google_fit=error`)
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokens

    if (!access_token) {
      return NextResponse.redirect(`${appUrl}/dashboard?google_fit=error`)
    }

    // Calculer la date d'expiration
    const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

    // Stocker les tokens dans Supabase
    const supabase = await createServerSupabaseClient()
    const { error: upsertError } = await supabase.from('integrations').upsert({
      user_id: userId,
      provider: 'google_fit',
      access_token,
      refresh_token: refresh_token || null,
      token_expiry: tokenExpiry,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError)
      return NextResponse.redirect(`${appUrl}/dashboard?google_fit=error`)
    }

    return NextResponse.redirect(`${appUrl}/dashboard?google_fit=success`)

  } catch (err) {
    console.error('Google Fit callback error:', err)
    return NextResponse.redirect(`${appUrl}/dashboard?google_fit=error`)
  }
}
