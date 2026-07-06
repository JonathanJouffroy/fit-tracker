'use client'
import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system'
    setTheme(saved)
  }, [])

  function choisir(t) {
    setTheme(t)
    localStorage.setItem('theme', t)
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    if (t === 'dark') root.classList.add('dark')
    else if (t === 'light') root.classList.add('light')
  }

  const options = [
    { value: 'light', label: '☀️ Clair' },
    { value: 'system', label: '💻 Auto' },
    { value: 'dark', label: '🌙 Sombre' },
  ]

  return (
    <div>
      <p className="label mb-2">Apparence</p>
      <div className="flex gap-2">
        {options.map(o => (
          <button key={o.value} onClick={() => choisir(o.value)}
            className="flex-1 py-2 rounded-xl text-sm font-medium"
            style={{
              background: theme === o.value ? 'var(--orange)' : 'var(--surface-2)',
              color: theme === o.value ? 'white' : 'var(--text-muted)',
            }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
