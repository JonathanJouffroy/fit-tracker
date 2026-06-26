'use client'
import { useEffect, useRef, useState } from 'react'

export default function ScannerCodeBarre({ onResultat, onFermer }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [statut, setStatut] = useState('init') // 'init' | 'scan' | 'chargement' | 'erreur'
  const [messageErreur, setMessageErreur] = useState('')

  useEffect(() => {
    let actif = true

    async function demarrerScan() {
      try {
        // Charger @zxing/browser dynamiquement (pas de SSR)
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        setStatut('scan')

        await reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, err) => {
          if (!result || !actif) return

          const code = result.getText()
          setStatut('chargement')

          // Arrêter le scan immédiatement
          try { reader.reset() } catch {}

          // Appel Open Food Facts
          try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`)
            const data = await res.json()

            if (data.status === 0 || !data.product) {
              setStatut('erreur')
              setMessageErreur('Produit non trouvé dans la base Open Food Facts.')
              return
            }

            const produit = data.product
            const nom = produit.product_name_fr || produit.product_name || 'Produit inconnu'
            const kcalPour100g = produit.nutriments?.['energy-kcal_100g']
              || produit.nutriments?.['energy-kcal']
              || null
            const proteines = produit.nutriments?.['proteins_100g'] || null
            const glucides = produit.nutriments?.['carbohydrates_100g'] || null
            const lipides = produit.nutriments?.['fat_100g'] || null
            const quantite = produit.serving_size || null

            onResultat({
              nom, quantite, code,
              kcal: kcalPour100g ? Math.round(kcalPour100g) : null,
              proteines: proteines ? Math.round(proteines * 10) / 10 : null,
              glucides: glucides ? Math.round(glucides * 10) / 10 : null,
              lipides: lipides ? Math.round(lipides * 10) / 10 : null,
            })
          } catch {
            setStatut('erreur')
            setMessageErreur('Impossible de contacter Open Food Facts.')
          }
        })
      } catch (e) {
        if (!actif) return
        setStatut('erreur')
        setMessageErreur('Impossible d\'accéder à la caméra. Vérifie les permissions.')
      }
    }

    demarrerScan()

    return () => {
      actif = false
      try { readerRef.current?.reset() } catch {}
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* Viewfinder caméra */}
      <div className="relative flex-1">
        <video ref={videoRef} className="w-full h-full object-cover" />

        {/* Cadre de visée */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-40">
            {/* Coins du cadre */}
            {[
              'top-0 left-0 border-t-4 border-l-4',
              'top-0 right-0 border-t-4 border-r-4',
              'bottom-0 left-0 border-b-4 border-l-4',
              'bottom-0 right-0 border-b-4 border-r-4',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-8 h-8 rounded-sm ${cls}`}
                style={{ borderColor: 'var(--orange)' }} />
            ))}
            {/* Ligne de scan animée */}
            <div className="absolute left-2 right-2 h-0.5 bg-orange-500 opacity-80"
              style={{ top: '50%', boxShadow: '0 0 8px #FF5722' }} />
          </div>
        </div>

        {/* Statut */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          {statut === 'scan' && (
            <p className="text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded-full">
              Pointe la caméra vers le code-barres
            </p>
          )}
          {statut === 'chargement' && (
            <p className="text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded-full">
              Recherche du produit...
            </p>
          )}
          {statut === 'erreur' && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-white text-sm bg-red-600 bg-opacity-90 px-4 py-2 rounded-full text-center mx-4">
                {messageErreur}
              </p>
              <button
                onClick={() => { setStatut('init'); window.location.reload() }}
                className="text-white text-sm bg-black bg-opacity-60 px-4 py-2 rounded-full">
                Réessayer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bouton fermer */}
      <div className="p-4" style={{ background: 'var(--surface)' }}>
        <button onClick={onFermer} className="w-full py-3 rounded-xl font-semibold text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}
