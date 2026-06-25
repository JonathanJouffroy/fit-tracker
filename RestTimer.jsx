'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Semaine', icon: '🏋️' },
  { href: '/progression', label: 'Progrès', icon: '📈' },
  { href: '/historique', label: 'Historique', icon: '📋' },
  { href: '/repas', label: 'Repas', icon: '🍽️' },
  { href: '/profil', label: 'Profil', icon: '⚖️' },
]

export default function BottomNav() {
  const pathname = usePathname()
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
