'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePreferences } from '@/lib/usePreferences'

const ALL_TABS = [
  { href: '/dashboard', label: "Aujourd'hui", icon: '📅', nutrition: false },
  { href: '/', label: 'Séances', icon: '🏋️', nutrition: false },
  { href: '/progression', label: 'Progrès', icon: '📈', nutrition: false },
  { href: '/repas', label: 'Repas', icon: '🍽️', nutrition: true },
  { href: '/profil', label: 'Profil', icon: '⚖️', nutrition: false },
]

const PAGES_SANS_NAV = ['/login', '/onboarding']

export default function BottomNav() {
  const pathname = usePathname()
  const { prefs } = usePreferences()
  if (PAGES_SANS_NAV.some((p) => pathname.startsWith(p))) return null

  const tabs = ALL_TABS.filter(t => !t.nutrition || prefs.mode_nutrition)

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto"
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
      <div className="flex justify-around py-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href ||
            (tab.href !== '/' && pathname.startsWith(tab.href + '/'))
          return (
            <Link key={tab.href} href={tab.href}
              className="flex flex-col items-center gap-0.5 relative px-3 py-1.5"
              style={{ color: isActive ? 'var(--orange)' : 'var(--text-faint)', minWidth: 52 }}>
              {/* Pastille indicateur actif */}
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 32,
                  height: 3,
                  background: 'var(--orange)',
                  borderRadius: '0 0 4px 4px',
                }} />
              )}
              <span style={{
                fontSize: 22,
                lineHeight: 1,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.15s ease',
              }}>{tab.icon}</span>
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: isActive ? '0.01em' : 0,
              }}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
