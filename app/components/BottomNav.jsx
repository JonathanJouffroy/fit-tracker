'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Séances', icon: '🏋️' },
  { href: '/progression', label: 'Progrès', icon: '📈' },
  { href: '/repas', label: 'Repas', icon: '🍽️' },
  { href: '/profil', label: 'Profil', icon: '⚖️' },
]

// Pages où la nav ne doit pas apparaître
const PAGES_SANS_NAV = ['/login', '/onboarding']

export default function BottomNav() {
  const pathname = usePathname()

  // Masquer la nav sur les pages publiques
  if (PAGES_SANS_NAV.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex justify-around py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href + '/'))
          return (
            <Link key={tab.href} href={tab.href}
              className="nav-link py-1 px-1"
              style={{ color: isActive ? 'var(--orange)' : 'var(--text-muted)' }}>
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px]">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
