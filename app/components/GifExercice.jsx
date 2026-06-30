'use client'
import { useState } from 'react'
import { useExerciceGif } from '@/lib/useExerciceGif'

export default function GifExercice({ nomExercice }) {
  const [visible, setVisible] = useState(false)
  const { gif, loading, erreur } = useExerciceGif(visible ? nomExercice : null)

  if (!process.env.NEXT_PUBLIC_EXERCISEDB_KEY) return null

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="mt-1 text-xs flex items-center gap-1"
        style={{ color: 'var(--text-faint)' }}>
        <span>▶</span> Voir la technique
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)' }}>
      <div className="flex justify-between items-center px-3 py-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Technique{gif?.nomEn ? ` · ${gif.nomEn}` : ''}
        </p>
        <button onClick={() => setVisible(false)} className="text-xs" style={{ color: 'var(--text-faint)' }}>✕</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Recherche...</span>
        </div>
      ) : erreur ? (
        <p className="text-xs text-center py-4" style={{ color: '#f59e0b' }}>
          Connexion impossible. Vérifie ta clé API.
        </p>
      ) : gif?.gif ? (
        <div>
          <img
            src={gif.gif}
            alt={`Technique ${nomExercice}`}
            className="w-full object-contain"
            style={{ maxHeight: '240px', background: '#111' }}
          />
          {gif.muscles?.length > 0 && (
            <p className="text-xs px-3 py-2" style={{ color: 'var(--text-faint)' }}>
              Muscles : {gif.muscles.join(', ')}
            </p>
          )}
        </div>
      ) : (
        <div className="px-3 py-4 text-center">
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Aucune démonstration trouvée pour "{nomExercice}".
          </p>
        </div>
      )}
    </div>
  )
}
