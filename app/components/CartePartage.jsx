'use client'
import { useRef, useState, useEffect } from 'react'
import { dessinerSilhouette } from '@/lib/silhouette'

function formatDuree(secondes) {
  if (!secondes) return null
  const h = Math.floor(secondes / 3600)
  const m = Math.floor((secondes % 3600) / 60)
  const s = secondes % 60
  if (h > 0) return `${h}h${m.toString().padStart(2,'0')}`
  if (m > 0) return `${m}min ${s.toString().padStart(2,'0')}s`
  return `${s}s`
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

async function dessiner(canvas, seance) {
  const W = 1080, H = 1920
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fond
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0d0d0d')
  bg.addColorStop(1, '#1a0d07')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Grain
  ctx.save()
  ctx.globalAlpha = 0.02
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }
  ctx.restore()

  // ---- HEADER ----
  ctx.font = 'bold 52px system-ui,sans-serif'
  ctx.fillStyle = '#FF5722'
  ctx.textAlign = 'left'
  ctx.fillText('FIT TRACKER', 80, 145)

  // Point déco
  ctx.beginPath()
  ctx.arc(W - 100, 125, 12, 0, Math.PI * 2)
  ctx.fillStyle = '#FF5722'
  ctx.globalAlpha = 0.6
  ctx.fill()
  ctx.globalAlpha = 1

  // Date
  const dateStr = new Date(seance.date + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  ctx.font = '36px system-ui,sans-serif'
  ctx.fillStyle = '#666'
  const dateFormate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  ctx.fillText(dateFormate, 80, 205)

  // Ligne séparation dégradée
  const linGrad = ctx.createLinearGradient(80, 0, W - 80, 0)
  linGrad.addColorStop(0, '#FF5722')
  linGrad.addColorStop(0.6, '#FF572260')
  linGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = linGrad
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, 235)
  ctx.lineTo(W - 80, 235)
  ctx.stroke()

  // ---- STATS PRINCIPALES ----
  const dureeStr = formatDuree(seance.duree)
  const stats = []
  if (dureeStr) stats.push({ val: dureeStr, label: 'DURÉE' })
  if (seance.kcalTotal > 0) stats.push({ val: String(seance.kcalTotal), label: 'KCAL' })
  const nbSeriesTotal = seance.exercices
    .filter(e => e.type_exercice !== 'cardio')
    .reduce((a, e) => a + (Array.isArray(e.series) ? e.series.length : 0), 0)
  if (nbSeriesTotal > 0) stats.push({ val: String(nbSeriesTotal), label: 'SÉRIES' })

  let y = 370
  if (stats.length > 0) {
    const colW = (W - 160) / stats.length
    stats.forEach((s, i) => {
      const x = 80 + i * colW + colW / 2
      ctx.textAlign = 'center'
      const fontSize = String(s.val).length > 6 ? 72 : 88
      ctx.font = `bold ${fontSize}px system-ui,sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(String(s.val), x, y)
      ctx.font = 'bold 28px system-ui,sans-serif'
      ctx.fillStyle = '#FF5722'
      ctx.fillText(s.label, x, y + 52)
    })

    // Séparateurs
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1
    for (let i = 1; i < stats.length; i++) {
      const sepX = 80 + i * colW
      ctx.beginPath()
      ctx.moveTo(sepX, 300)
      ctx.lineTo(sepX, 420)
      ctx.stroke()
    }
    y = 480
  }

  // ---- EXERCICES MUSCU ----
  const exosMuscu = seance.exercices.filter(e => e.type_exercice !== 'cardio')
  if (exosMuscu.length > 0) {
    ctx.textAlign = 'left'
    ctx.font = 'bold 32px system-ui,sans-serif'
    ctx.fillStyle = '#FF5722'
    ctx.fillText('MUSCULATION', 80, y)

    // Ligne sous titre
    ctx.save()
    ctx.strokeStyle = '#FF5722'
    ctx.globalAlpha = 0.25
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(80, y + 14)
    ctx.lineTo(430, y + 14)
    ctx.stroke()
    ctx.restore()
    y += 52

    exosMuscu.slice(0, 7).forEach(exo => {
      const nom = typeof exo.nom === 'string' ? exo.nom : '?'
      const series = Array.isArray(exo.series) ? exo.series : []
      const nbSeries = series.length
      const avecPoids = series.filter(s => s && typeof s.poids === 'number' && s.poids > 0)
      const poidsMax = avecPoids.length > 0
        ? Math.max(...avecPoids.map(s => s.poids))
        : null
      const repsMax = avecPoids.length > 0
        ? Math.max(...avecPoids.map(s => s.reps || 0))
        : null

      const cardH = 108
      ctx.fillStyle = '#181818'
      rr(ctx, 80, y, W - 160, cardH, 18)
      ctx.fill()

      // Bordure gauche orange
      ctx.fillStyle = '#FF5722'
      rr(ctx, 80, y, 5, cardH, 3)
      ctx.fill()

      // Nom (tronqué si trop long)
      const nomAffiche = nom.length > 22 ? nom.slice(0, 21) + '…' : nom
      ctx.font = 'bold 36px system-ui,sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.fillText(nomAffiche, 110, y + 42)

      // Détails : séries · poids max
      const details = []
      details.push(`${nbSeries} série${nbSeries > 1 ? 's' : ''}`)
      if (poidsMax) details.push(`${poidsMax}kg max`)
      if (repsMax) details.push(`${repsMax} reps`)

      ctx.font = '28px system-ui,sans-serif'
      ctx.fillStyle = '#666'
      ctx.fillText(details.join(' · '), 110, y + 80)

      // PR badge
      if (exo.pr) {
        ctx.fillStyle = '#FF5722'
        rr(ctx, W - 210, y + 22, 110, 36, 10)
        ctx.fill()
        ctx.font = 'bold 24px system-ui,sans-serif'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.fillText('🏆 PR', W - 155, y + 46)
        ctx.textAlign = 'left'
      }

      y += cardH + 14
    })

    if (exosMuscu.length > 7) {
      ctx.font = '28px system-ui,sans-serif'
      ctx.fillStyle = '#444'
      ctx.textAlign = 'left'
      ctx.fillText(`+ ${exosMuscu.length - 7} autres exercices`, 80, y + 10)
      y += 45
    }
  }

  // ---- EXERCICES CARDIO ----
  const exosCardio = seance.exercices.filter(e => e.type_exercice === 'cardio')
  if (exosCardio.length > 0) {
    y += 20
    ctx.textAlign = 'left'
    ctx.font = 'bold 32px system-ui,sans-serif'
    ctx.fillStyle = '#3B82F6'
    ctx.fillText('CARDIO', 80, y)

    ctx.save()
    ctx.strokeStyle = '#3B82F6'
    ctx.globalAlpha = 0.25
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(80, y + 14)
    ctx.lineTo(270, y + 14)
    ctx.stroke()
    ctx.restore()
    y += 52

    exosCardio.forEach(exo => {
      const nom = typeof exo.nom === 'string' ? exo.nom : '?'
      const cardH = 120

      ctx.fillStyle = '#0d1929'
      rr(ctx, 80, y, W - 160, cardH, 18)
      ctx.fill()

      ctx.fillStyle = '#3B82F6'
      rr(ctx, 80, y, 5, cardH, 3)
      ctx.fill()

      ctx.font = 'bold 36px system-ui,sans-serif'
      ctx.fillStyle = '#6BA3FF'
      ctx.textAlign = 'left'
      const nomAffiche = nom.length > 25 ? nom.slice(0, 24) + '…' : nom
      ctx.fillText(nomAffiche, 110, y + 46)

      // Métriques
      const metriques = []
      if (exo.duree_minutes) metriques.push(`⏱ ${exo.duree_minutes}min`)
      if (exo.distance_m) {
        const dist = exo.distance_m >= 1000
          ? `${(exo.distance_m / 1000).toFixed(1)}km`
          : `${exo.distance_m}m`
        metriques.push(`📍 ${dist}`)
      }
      if (exo.denivele_m) metriques.push(`⛰ +${exo.denivele_m}m`)
      if (exo.nb_sauts) metriques.push(`🪢 ${exo.nb_sauts}`)

      ctx.font = '28px system-ui,sans-serif'
      ctx.fillStyle = '#4B7FCC'
      ctx.fillText(metriques.join('   ') || 'Séance enregistrée', 110, y + 90)

      y += cardH + 14
    })
  }

  // ---- SILHOUETTE DES ZONES TRAVAILLÉES ----
  if (y < H - 500 && seance.zonesActives?.length > 0) {
    y += 30
    ctx.textAlign = 'left'
    ctx.font = 'bold 30px system-ui,sans-serif'
    ctx.fillStyle = '#666'
    ctx.fillText('ZONES TRAVAILLÉES', 80, y)
    y += 20

    const ZONES_FACE_SET = ['epaules', 'pectoraux', 'abdos', 'biceps', 'quadriceps', 'fessiers', 'mollets']
    const ZONES_DOS_SET = ['dos', 'epaules', 'triceps', 'ischios', 'mollets']

    const aFace = seance.zonesActives.some(z => ZONES_FACE_SET.includes(z))
    const aDos = seance.zonesActives.some(z => ZONES_DOS_SET.includes(z))
    const lesDeuxVues = aFace && aDos

    const silhouetteH = Math.min(420, H - y - 160)
    const silhouetteW = lesDeuxVues ? W - 160 : (W - 160) * 0.6
    const silhouetteX = lesDeuxVues ? 80 : W / 2 - silhouetteW / 2

    await dessinerSilhouette(ctx, silhouetteX, y, silhouetteW, silhouetteH, seance.zonesActives, { aFace, aDos })
    y += silhouetteH + 50
  }

  // ---- NOTE ----
  if (seance.note && typeof seance.note === 'string') {
    const noteY = Math.max(y + 20, H - 310)
    ctx.fillStyle = '#161616'
    rr(ctx, 80, noteY, W - 160, 140, 18)
    ctx.fill()

    ctx.font = 'bold 26px system-ui,sans-serif'
    ctx.fillStyle = '#FF5722'
    ctx.globalAlpha = 0.6
    ctx.textAlign = 'left'
    ctx.fillText('NOTE', 108, noteY + 38)
    ctx.globalAlpha = 1

    const note = seance.note.length > 65 ? seance.note.slice(0, 65) + '…' : seance.note
    ctx.font = 'italic 30px system-ui,sans-serif'
    ctx.fillStyle = '#999'
    ctx.fillText(`"${note}"`, 108, noteY + 95)
  }

  // ---- FOOTER ----
  ctx.textAlign = 'center'
  ctx.font = '26px system-ui,sans-serif'
  ctx.fillStyle = '#333'
  ctx.fillText('fit-tracker.app', W / 2, H - 55)

  ctx.beginPath()
  ctx.arc(W / 2 - 115, H - 62, 7, 0, Math.PI * 2)
  ctx.fillStyle = '#FF5722'
  ctx.globalAlpha = 0.45
  ctx.fill()
  ctx.globalAlpha = 1
}

export default function CartePartage({ seance, onFermer }) {
  const canvasRef = useRef(null)
  const [generee, setGeneree] = useState(false)
  const [partage, setPartage] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const timer = setTimeout(async () => {
      try {
        await dessiner(canvasRef.current, seance)
      } catch (e) {
        console.error('Erreur canvas:', e)
      }
      setGeneree(true)
    }, 150)
    return () => clearTimeout(timer)
  }, [seance])

  async function partager() {
    if (!canvasRef.current || !generee) return
    setPartage(true)
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) { setPartage(false); return }
      const file = new File([blob], `seance-${seance.date}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Ma séance Fit Tracker' })
        } catch (e) {
          if (e.name !== 'AbortError') telecharger(blob)
        }
      } else {
        telecharger(blob)
      }
      setPartage(false)
    }, 'image/png', 0.95)
  }

  function telecharger(blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seance-${seance.date}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.97)' }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onFermer} className="text-sm font-medium" style={{ color: 'var(--orange)' }}>← Retour</button>
        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Partager la séance</p>
        <div style={{ width: '60px' }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <canvas ref={canvasRef} style={{
          maxHeight: '100%',
          maxWidth: '100%',
          objectFit: 'contain',
          borderRadius: '12px',
          opacity: generee ? 1 : 0,
          transition: 'opacity 0.3s',
          boxShadow: generee ? '0 0 40px rgba(255,87,34,0.15)' : 'none',
        }} />
        {!generee && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Génération de la carte...</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-6 pt-3 flex flex-col gap-2" style={{ background: 'var(--surface)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
          Sur mobile, choisir Instagram, WhatsApp ou autre
        </p>
        <button onClick={partager} disabled={!generee || partage}
          className="btn-primary py-4 text-base font-bold disabled:opacity-50">
          {partage ? 'Partage en cours...' : '📤 Partager / Télécharger'}
        </button>
      </div>
    </div>
  )
}
