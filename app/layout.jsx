import './globals.css'
import Nav from '@/components/Nav'

const BASE_URL = 'https://calartiste.vercel.app'

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Calar.Artiste — Peintures originales, art intuitif & abstrait | Clara artiste',
    template: '%s | Calar.Artiste — Art intuitif & abstrait'
  },
  description: 'Découvrez la galerie de Clara, artiste peintre autodidacte. Œuvres originales uniques en art intuitif et abstrait : acrylique, pointillisme, techniques mixtes. Voyagez entre émotion, nature et émotions à travers ses toiles colorées.',
  keywords: ['art intuitif', 'art abstrait', 'peinture originale', 'Calar artiste', 'Clara artiste peintre', 'acrylique sur toile', 'pointillisme', 'œuvres originales à vendre', 'galerie art en ligne', 'peinture abstraite colorée', 'artiste française'],
  authors: [{ name: 'Clara — Calar.Artiste' }],
  creator: 'Calar.Artiste',
  publisher: 'Calar.Artiste',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true }
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: BASE_URL,
    siteName: 'Calar.Artiste',
    title: 'Calar.Artiste — Peintures originales, art intuitif & abstrait',
    description: 'Galerie en ligne de Clara, artiste peintre. Œuvres originales uniques en art intuitif et abstrait — acrylique, pointillisme, techniques mixtes. Entre émotion, nature et émotions.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Calar.Artiste — Galerie de peintures originales' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calar.Artiste — Peintures originales, art intuitif & abstrait',
    description: 'Galerie en ligne de Clara, artiste peintre. Œuvres originales uniques en art intuitif et abstrait — acrylique, pointillisme, techniques mixtes.',
    images: ['/og-image.jpg'],
    creator: '@calar.artiste'
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png'
  },
  alternates: {
    canonical: BASE_URL
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/* JSON-LD — Données structurées pour Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ArtGallery',
            name: 'Calar.Artiste',
            description: 'Galerie d\'art en ligne de Clara, artiste peintre autodidacte spécialisée en art intuitif et abstrait. Œuvres originales uniques en acrylique, pointillisme et techniques mixtes.',
            url: BASE_URL,
            sameAs: ['https://www.instagram.com/calar.artiste'],
            inLanguage: 'fr-FR',
            image: `${BASE_URL}/og-image.jpg`,
            priceRange: '€€',
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Peintures originales',
              description: 'Œuvres originales uniques en art intuitif et abstrait'
            },
            artist: {
              '@type': 'Person',
              name: 'Clara',
              alternateName: 'Calar.Artiste',
              jobTitle: 'Artiste peintre',
              description: 'Infirmière et artiste peintre autodidacte, spécialisée en art intuitif et abstrait. Son travail puise dans les émotions et la beauté de la nature.',
              sameAs: ['https://www.instagram.com/calar.artiste'],
              knowsAbout: ['Art intuitif', 'Art abstrait', 'Acrylique', 'Pointillisme', 'Techniques mixtes']
            }
          })}}
        />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
