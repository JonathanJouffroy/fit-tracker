import './globals.css'
import BottomNav from './components/BottomNav'

export const metadata = {
  title: 'Fit Tracker',
  description: 'Suivi entraînements, repas et profil',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <main className="max-w-md mx-auto min-h-screen pb-24 px-4 pt-6">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
