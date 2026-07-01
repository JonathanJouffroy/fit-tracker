'use client'
import { useEffect } from 'react'

export default function Drawer({ ouvert, onFermer, titre, children }) {
  // Bloquer le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (ouvert) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [ouvert])

  if (!ouvert) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onFermer}
      />

      {/* Panneau */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto rounded-t-2xl flex flex-col"
        style={{
          background: 'var(--surface)',
          maxHeight: '85vh',
          animation: 'slideUp 0.25s ease-out',
        }}>

        {/* Poignée */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{titre}</p>
          <button onClick={onFermer} className="text-sm px-2 py-1 rounded-lg"
            style={{ color: 'var(--text-faint)', background: 'var(--surface-2)' }}>
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
