'use client'
import { useState } from 'react'
import { useExerciceGif } from '@/lib/useExerciceGif'

export default function GifExercice({ nomExercice }) {
  const [visible, setVisible] = useState(false)
  const { gif, loading } = useExerciceGif(visible ? nomExercice : null)

  // Ne pas afficher si pas de clé API configurée
  if (!process.env.NEXT_PUBLIC_EXERCISEDB_KEY) return null

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
        style={{ background: 'var(--surface-2)', color: 'var(--text-faint)' }}>
        <span>▶</span> Voir la technique
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)' }}>
      <div className="flex justify-between items-center px-3 py-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Technique</p>
        <button onClick={() => setVisible(false)} className="text-xs" style={{ color: 'var(--text-faint)' }}>✕</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : gif?.gif ? (
        <div>
          <img
            src={gif.gif}
            alt={`Technique ${nomExercice}`}
            className="w-full object-cover"
            style={{ maxHeight: '240px', objectFit: 'contain', background: '#1a1a1a' }}
          />
          {gif.muscles?.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                Muscles : {gif.muscles.join(', ')}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-center py-4 pb-4" style={{ color: 'var(--text-faint)' }}>
          Aucune démonstration trouvée pour cet exercice.
        </p>
      )}
    </div>
  )
}
