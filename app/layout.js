import './globals.css'
import BottomNav from './components/BottomNav'
import { ToastProvider } from './components/Toast'
import PWARegister from './components/PWARegister'
import { BanniereConnexion } from './components/Erreur'

export const metadata = {
  title: 'Fit Tracker',
  description: 'Suivi entraînements, repas et profil',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fit Tracker',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport = {
  themeColor: '#FF5722',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <PWARegister />
        <ToastProvider>
          <BanniereConnexion />
          <main className="max-w-md mx-auto min-h-screen pb-24 px-4 pt-6">
            {children}
          </main>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  )
}
