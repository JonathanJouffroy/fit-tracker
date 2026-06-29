'use client'

export default function Header({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{title}</h1>
      {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  )
}
