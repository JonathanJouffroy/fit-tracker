import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import ArtworkCard from '@/components/ArtworkCard'

export const metadata = {
  title: 'Calar.Artiste — Peintures originales, art intuitif & abstrait | Clara artiste peintre',
  description: 'Bienvenue dans la galerie de Clara, artiste peintre. Découvrez ses œuvres originales uniques : peintures intuitives et abstraites aux couleurs vives, inspirées de la nature et des émotions. Acrylique, pointillisme, techniques mixtes.',
  openGraph: {
    title: 'Calar.Artiste — Peintures originales, art intuitif & abstrait',
    description: 'Galerie en ligne de Clara, artiste peintre. Œuvres originales en art intuitif et abstrait — acrylique, pointillisme, techniques mixtes. Entre émotion, nature et émotions.',
    url: 'https://calartiste.vercel.app',
  }
}

async function getHomeData() {
  const [{ data: artworks }, { data: settings }] = await Promise.all([
    supabase.from('artworks').select('*').order('sort_order').order('created_at'),
    supabase.from('settings').select('key, value')
  ])

  const s = {}
  ;(settings || []).forEach(r => { s[r.key] = r.value })

  return {
    artworks: artworks || [],
    settings: {
      heroLine1:   s.heroLine1   || "L'art qui fait",
      heroLine2:   s.heroLine2   || 'voyager',
      heroDesc:    s.heroDesc    || 'Entre émotion, nature et émotions — chaque toile de Clara est un voyage intérieur peint avec sincérité et énergie.',
      heroBtn:     s.heroBtn     || 'Voir les œuvres',
      heroEyebrow: s.heroEyebrow || 'Art intuitif & abstrait',
      aboutLine1:  s.aboutLine1  || 'Infirmière',
      aboutLine2:  s.aboutLine2  || 'artiste',
      aboutText:   s.aboutText   || "Clara est artiste, passionnée et créative.",
      featuredId:  s.featuredId  || null,
      recentId1:   s.recentId1   || null,
      recentId2:   s.recentId2   || null,
      recentId3:   s.recentId3   || null,
    }
  }
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { artworks, settings } = await getHomeData()

  const recentIds = [settings.recentId1, settings.recentId2, settings.recentId3].filter(Boolean)
  const recent = recentIds.length > 0
    ? recentIds.map(id => artworks.find(a => String(a.id) === String(id))).filter(Boolean)
    : artworks.slice(0, 3)

  return (
    <>
      {/* HERO — texte centré uniquement */}
      <section style={{
        paddingTop:80,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        textAlign:'center', padding:'120px 48px 80px',
        background:'var(--cream)'
      }}>
        <p style={{fontSize:11, fontWeight:500, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--blue)', marginBottom:20}}>
          {settings.heroEyebrow}
        </p>
        <h1 style={{fontFamily:"'Cormorant Garant', serif", fontSize:'clamp(48px, 7vw, 88px)', fontWeight:300, lineHeight:1.08, marginBottom:24, maxWidth:800}}>
          {settings.heroLine1}<br/>
          <em style={{fontStyle:'italic', color:'var(--gold)'}}>{settings.heroLine2}</em>
        </h1>
        <p style={{fontSize:16, color:'var(--stone)', lineHeight:1.85, maxWidth:520, marginBottom:44}}>
          {settings.heroDesc}
        </p>
        <Link href="/galerie" style={{
          display:'inline-block', padding:'14px 40px',
          background:'var(--gold)', color:'#e9e5da',
          fontSize:11, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase'
        }}>
          {settings.heroBtn}
        </Link>
      </section>

      {/* RECENT WORKS */}
      <section style={{padding:'80px 48px', background:'var(--cream)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:48}}>
          <h2 style={{fontFamily:"'Cormorant Garant', serif", fontSize:36, fontWeight:300}}>Œuvres récentes</h2>
          <Link href="/galerie" style={{fontSize:11, fontWeight:500, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--stone)'}}>
            Voir toute la galerie →
          </Link>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:32}}>
          {recent.map(a => <ArtworkCard key={a.id} artwork={a} />)}
        </div>
      </section>

      {/* ABOUT */}
      <section style={{
        background:'#dedad3', borderTop:'2px solid var(--gold)', borderBottom:'2px solid var(--gold)',
        padding:'80px 48px', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:80, alignItems:'center'
      }}>
        <h2 style={{fontFamily:"'Cormorant Garant', serif", fontSize:44, fontWeight:300, lineHeight:1.1}}>
          {settings.aboutLine1}<br/>& <em style={{fontStyle:'italic', color:'var(--gold)'}}>{settings.aboutLine2}</em>
        </h2>
        <p style={{fontSize:15, lineHeight:1.8, color:'var(--stone)'}}>
          {settings.aboutText}
        </p>
      </section>

      {/* FOOTER */}
      <footer style={{
        background:'#d4d0c7', borderTop:'1px solid rgba(197,110,74,0.2)',
        color:'rgba(42,37,32,0.5)', padding:'40px 48px',
        display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12
      }}>
        <span style={{fontFamily:"'Cormorant Garant', serif", fontSize:18, color:'var(--gold)'}}>Calar.Artiste</span>
        <a href="https://www.instagram.com/calar.artiste" target="_blank" rel="noopener"
          style={{display:'flex', alignItems:'center', gap:8, color:'var(--gold)', fontSize:12, fontWeight:500}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="0.8" fill="var(--gold)" stroke="none"/>
          </svg>
          @calar.artiste
        </a>
        <span>© 2026 · Calar.Artiste · Tous droits réservés</span>
      </footer>
    </>
  )
}
