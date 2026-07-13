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

    // 1. Chercher dans aliments_base (ilike pour recherche partielle)
    const { data: locaux } = await supabase
      .from('aliments_base')
      .select('*')
      .ilike('nom', `%${q}%`)
      .order('nom')
      .limit(5)

    if (locaux?.length >= 3) {
      return NextResponse.json({
        resultats: locaux.map(a => ({
          id: `local-${a.id}`,
          nom: a.nom,
          kcal_100g: a.kcal_100g,
          proteines_100g: a.proteines_100g,
          glucides_100g: a.glucides_100g,
          lipides_100g: a.lipides_100g,
          source: 'base',
        }))
      })
    }

    // 2. Fallback Open Food Facts si pas assez de résultats locaux
    const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=5&lc=fr&fields=product_name,nutriments`
    const offRes = await fetch(offUrl, { signal: AbortSignal.timeout(3000) })

    let resultatsOFF = []
    if (offRes.ok) {
      const offData = await offRes.json()
      resultatsOFF = (offData.products || [])
        .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'])
        .slice(0, 5 - (locaux?.length || 0))
        .map(p => ({
          id: `off-${p.id || Math.random()}`,
          nom: p.product_name,
          kcal_100g: Math.round(p.nutriments['energy-kcal_100g'] || 0),
          proteines_100g: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
          glucides_100g: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
          lipides_100g: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
          source: 'off',
        }))
    }

    return NextResponse.json({
      resultats: [...(locaux || []).map(a => ({
        id: `local-${a.id}`,
        nom: a.nom,
        kcal_100g: a.kcal_100g,
        proteines_100g: a.proteines_100g,
        glucides_100g: a.glucides_100g,
        lipides_100g: a.lipides_100g,
        source: 'base',
      })), ...resultatsOFF]
    })
  } catch (err) {
    console.error('Recherche aliments error:', err)
    return NextResponse.json({ resultats: [] })
  }
}
