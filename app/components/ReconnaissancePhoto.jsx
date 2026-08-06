'use client'
import { useState, useRef } from 'react'

export default function ReconnaissancePhoto({ onResultat, onFermer }) {
  const [etape, setEtape] = useState('capture') // capture | analyse | resultat
  const [imageUrl, setImageUrl] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [mimeType, setMimeType] = useState('image/jpeg')
  const [resultat, setResultat] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [selectionnes, setSelectionnes] = useState([])
  const inputRef = useRef(null)

  function onImageChoisie(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMimeType('image/jpeg')
    const url = URL.createObjectURL(file)
    setImageUrl(url)

    // Compresser l'image avant envoi (max 1200px, qualité 0.7)
    const img = new Image()
    img.onload = () => {
      const MAX = 1200
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
      setImageBase64(base64)
    }
    img.src = url
    setEtape('analyse')
  }

  async function analyser() {
    if (!imageBase64) return
    setLoading(true)
    setErreur(null)
    try {
      const res = await fetch('/api/ia/reconnaissance-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      const data = await res.json()
      setResultat(data.resultat)
      setSelectionnes(data.resultat.aliments.map((_, i) => i)) // tout sélectionné par défaut
      setEtape('resultat')
    } catch {
      setErreur('Impossible d\'analyser la photo. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  function toggleAliment(i) {
    setSelectionnes(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    )
  }

  function valider() {
    const alimentsChoisis = resultat.aliments.filter((_, i) => selectionnes.includes(i))
    onResultat(alimentsChoisis)
  }

  const CONFIANCE_COLOR = { haute: '#22c55e', moyenne: '#f59e0b', faible: '#ef4444' }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={onFermer} className="text-sm" style={{ color: 'var(--text-muted)' }}>
          ✕ Fermer
        </button>
        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
          📸 Reconnaissance d'aliments
        </p>
        <div style={{ width: 48 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Étape 1 : capture */}
        {etape === 'capture' && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-2)' }}>
              <span style={{ fontSize: 48 }}>📸</span>
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
                Photo de ton assiette
              </p>
              <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                Gemini va identifier les aliments et estimer les macros automatiquement
              </p>
            </div>
            <input ref={inputRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={onImageChoisie} />
            <div className="flex flex-col gap-3 w-full">
              <button onClick={() => inputRef.current?.click()}
                className="btn-primary py-3 font-semibold flex items-center justify-center gap-2">
                📷 Prendre une photo
              </button>
              <button onClick={() => { inputRef.current.removeAttribute('capture'); inputRef.current?.click() }}
                className="py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                🖼️ Choisir depuis la galerie
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 : aperçu + analyser */}
        {etape === 'analyse' && (
          <div className="flex flex-col gap-4">
            {imageUrl && (
              <img src={imageUrl} alt="Assiette" className="w-full rounded-xl object-cover"
                style={{ maxHeight: 300 }} />
            )}
            {erreur && (
              <p className="text-sm text-center" style={{ color: '#ef4444' }}>{erreur}</p>
            )}
            <button onClick={analyser} disabled={loading}
              className="btn-primary py-3 font-semibold disabled:opacity-40">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Analyse en cours...
                </span>
              ) : '🤖 Analyser avec Gemini'}
            </button>
            <button onClick={() => { setEtape('capture'); setImageUrl(null); setImageBase64(null) }}
              className="text-sm text-center" style={{ color: 'var(--text-faint)' }}>
              ← Reprendre une photo
            </button>
          </div>
        )}

        {/* Étape 3 : résultats */}
        {etape === 'resultat' && resultat && (
          <div className="flex flex-col gap-4">
            {imageUrl && (
              <img src={imageUrl} alt="Assiette" className="w-full rounded-xl object-cover"
                style={{ maxHeight: 200 }} />
            )}

            <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface-2)' }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>
                ANALYSE IA
              </p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>{resultat.description}</p>
              {resultat.note && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>ℹ️ {resultat.note}</p>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-around rounded-xl py-3"
              style={{ background: 'var(--surface-2)' }}>
              {[
                { label: 'kcal', val: selectionnes.reduce((a, i) => a + (resultat.aliments[i]?.kcal || 0), 0), color: 'var(--orange)' },
                { label: 'Prot.', val: `${selectionnes.reduce((a, i) => a + (resultat.aliments[i]?.proteines_g || 0), 0)}g`, color: 'var(--text)' },
                { label: 'Gluc.', val: `${selectionnes.reduce((a, i) => a + (resultat.aliments[i]?.glucides_g || 0), 0)}g`, color: 'var(--text)' },
                { label: 'Lip.', val: `${selectionnes.reduce((a, i) => a + (resultat.aliments[i]?.lipides_g || 0), 0)}g`, color: 'var(--text)' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className="text-base font-bold" style={{ color: m.color }}>{m.val}</p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{m.label}</p>
                </div>
              ))}
            </div>

            {/* Liste aliments */}
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              ALIMENTS DÉTECTÉS — Coche ceux à ajouter
            </p>
            <div className="flex flex-col gap-2">
              {resultat.aliments.map((a, i) => {
                const coche = selectionnes.includes(i)
                return (
                  <button key={i} onClick={() => toggleAliment(i)}
                    className="flex items-center gap-3 w-full text-left rounded-xl p-3"
                    style={{ background: coche ? 'var(--surface-2)' : 'transparent', border: `1px solid ${coche ? 'var(--orange)' : 'var(--border)'}` }}>
                    <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: coche ? 'var(--orange)' : 'var(--border)', background: coche ? 'var(--orange)' : 'transparent' }}>
                      {coche && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{a.nom}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: `${CONFIANCE_COLOR[a.confiance]}20`, color: CONFIANCE_COLOR[a.confiance] }}>
                          {a.confiance}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                        ~{a.quantite_g}g · {a.kcal} kcal · P:{a.proteines_g}g G:{a.glucides_g}g L:{a.lipides_g}g
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {resultat.note && (
              <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
                ⚠️ Estimations visuelles — les quantités peuvent varier
              </p>
            )}

            <button onClick={valider} disabled={selectionnes.length === 0}
              className="btn-primary py-3 font-semibold disabled:opacity-40">
              Ajouter {selectionnes.length} aliment{selectionnes.length > 1 ? 's' : ''} à mes repas
            </button>
            <button onClick={() => setEtape('capture')}
              className="text-sm text-center" style={{ color: 'var(--text-faint)' }}>
              ← Analyser une autre photo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
