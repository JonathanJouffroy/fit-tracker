import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    if (!q || q.length < 2) return NextResponse.json({ resultats: [] })

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: locaux, error: errLocaux } = await supabase
      .from('aliments_base')
      .select('*')
      .ilike('nom', `%${q}%`)
      .order('nom')
      .limit(8)

    console.log('Recherche:', q, '| Résultats:', locaux?.length, '| Erreur:', errLocaux?.message)

    const resultats = (locaux || []).map(a => ({
      id: `local-${a.id}`,
      nom: a.nom,
      kcal_100g: a.kcal_100g,
      proteines_100g: a.proteines_100g,
      glucides_100g: a.glucides_100g,
      lipides_100g: a.lipides_100g,
      source: 'base',
    }))

    return NextResponse.json({ resultats })
  } catch (err) {
    console.error('Recherche aliments error:', err)
    return NextResponse.json({ resultats: [] })
  }
}
