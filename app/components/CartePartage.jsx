'use client'
import { useRef, useState, useEffect } from 'react'
import { formaterMetriquesCardio } from '@/lib/calculs'

// Dessine la carte sur le canvas et retourne le canvas
function dessinerCarte(canvas, seance) {
  const W = 1080
  const H = 1920
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // ---- Fond dégradé sombre ----
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0a0a0a')
  grad.addColorStop(0.6, '#111111')
  grad.addColorStop(1, '#1a0a05')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // ---- Texture grain subtile ----
  ctx.save()
  ctx.globalAlpha = 0.03
  for (let i = 0; i < 8000; i++) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(
      Math.random() * W,
      Math.random() * H,
      Math.random() * 2,
      Math.random() * 2
    )
  }
  ctx.restore()

  // ---- Logo / App name ----
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#FF5722'
  ctx.textAlign = 'left'
  ctx.fillText('🏋️ FIT TRACKER', 80, 130)

  // ---- Date ----
  const dateStr = new Date(seance.date + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  ctx.font = '36px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#888888'
  ctx.fillText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), 80, 190)

  // ---- Ligne de séparation ----
  ctx.strokeStyle = '#FF5722'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(80, 220)
  ctx.lineTo(W - 80, 220)
  ctx.stroke()

  // ---- Durée + calories (stats principales) ----
  let yStats = 310
  const stats = []
  if (seance.duree) {
    const h = Math.floor(seance.duree / 3600)
    const m = Math.floor((seance.duree % 3600) / 60)
    const s = seance.duree % 60
    stats.push({
      valeur: h > 0 ? `${h}h ${m.toString().padStart(2, '0')}min` : `${m}min ${s.toString().padStart(2, '0')}s`,
      label: 'DURÉE',
    })
  }
  if (seance.kcalTotal > 0) {
    stats.push({ valeur: `${seance.kcalTotal}`, label: 'KCAL' })
  }
  if (seance.nbSeries > 0) {
    stats.push({ valeur: `${seance.nbSeries}`, label: 'SÉRIES' })
  }

  const colW = (W - 160) / Math.max(stats.length, 1)
  stats.forEach((stat, i) => {
    const x = 80 + i * colW + colW / 2
    ctx.textAlign = 'center'
    ctx.font = `bold ${stat.valeur.length > 6 ? '64' : '80'}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(stat.valeur, x, yStats)
    ctx.font = '32px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#FF5722'
    ctx.fillText(stat.label, x, yStats + 50)
  })

  // ---- Section exercices ----
  let y = yStats + 160

  const exercicesMuscu = seance.exercices.filter(e => e.type_exercice !== 'cardio')
  const exercicesCardio = seance.exercices.filter(e => e.type_exercice === 'cardio')

  if (exercicesMuscu.length > 0) {
    ctx.textAlign = 'left'
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#FF5722'
    ctx.fillText('MUSCULATION', 80, y)
    y += 60

    exercicesMuscu.slice(0, 8).forEach((exo) => {
      // Fond carte exercice
      const cardH = 100
      ctx.fillStyle = '#1e1e1e'
      roundRect(ctx, 80, y, W - 160, cardH, 16)
      ctx.fill()

      // Bordure gauche orange
      ctx.fillStyle = '#FF5722'
      roundRect(ctx, 80, y, 6, cardH, 3)
      ctx.fill()

      // Nom exercice
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      const nomTronque = exo.nom.length > 22 ? exo.nom.slice(0, 22) + '…' : exo.nom
      ctx.fillText(nomTronque, 110, y + 40)

      // Détails (séries × reps · poids)
      let details = `${exo.nb_series || exo.series || '?'} séries`
      if (exo.poids_max) details += ` · ${exo.poids_max}kg`
      if (exo.pr) details += ' 🏆 PR'
      ctx.font = '30px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#888888'
      ctx.fillText(details, 110, y + 78)

      // Kcal estimées
      if (exo.kcal) {
        ctx.textAlign = 'right'
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = '#FF5722'
        ctx.fillText(`~${exo.kcal} kcal`, W - 100, y + 55)
      }

      y += cardH + 16
    })

    if (exercicesMuscu.length > 8) {
      ctx.textAlign = 'left'
      ctx.font = '30px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#555555'
      ctx.fillText(`+ ${exercicesMuscu.length - 8} autres exercices`, 80, y + 10)
      y += 50
    }
  }

  // ---- Exercices cardio ----
  if (exercicesCardio.length > 0) {
    y += 20
    ctx.textAlign = 'left'
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#3B82F6'
    ctx.fillText('CARDIO', 80, y)
    y += 60

    exercicesCardio.forEach((exo) => {
      const cardH = 120
      ctx.fillStyle = '#111a2e'
      roundRect(ctx, 80, y, W - 160, cardH, 16)
      ctx.fill()

      ctx.fillStyle = '#3B82F6'
      roundRect(ctx, 80, y, 6, cardH, 3)
      ctx.fill()

      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.fillText(exo.nom, 110, y + 42)

      // Métriques cardio
      const metriques = []
      if (exo.duree_minutes) metriques.push(`⏱ ${exo.duree_minutes}min`)
      if (exo.distance_m) {
        const dist = exo.distance_m >= 1000
          ? `${(exo.distance_m / 1000).toFixed(1)}km`
          : `${exo.distance_m}m`
        metriques.push(`📍 ${dist}`)
      }
      if (exo.denivele_m) metriques.push(`⛰ +${exo.denivele_m}m`)
      if (exo.allure) metriques.push(`⚡ ${exo.allure}/km`)

      ctx.font = '30px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#6B9FFF'
      ctx.fillText(metriques.join('  '), 110, y + 86)

      y += cardH + 16
    })
  }

  // ---- Courbe décorative (style cardio) ----
  if (y < H - 350) {
    drawDecorativeCurve(ctx, W, H, y + 40)
  }

  // ---- Note de séance ----
  if (seance.note && y < H - 200) {
    y = Math.max(y + 60, H - 280)
    ctx.fillStyle = '#1e1e1e'
    roundRect(ctx, 80, y, W - 160, 120, 16)
    ctx.fill()
    ctx.font = 'italic 30px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#aaaaaa'
    ctx.textAlign = 'left'
    const noteMax = seance.note.length > 80 ? seance.note.slice(0, 80) + '…' : seance.note
    ctx.fillText(`"${noteMax}"`, 110, y + 55)
  }

  // ---- Footer ----
  ctx.textAlign = 'center'
  ctx.font = '28px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#444444'
  ctx.fillText('fit-tracker.app', W / 2, H - 60)

  return canvas
}

function roundRect(ctx, x, y, w, h, r) {
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

function drawDecorativeCurve(ctx, W, H, startY) {
  const points = Array.from({ length: 20 }, (_, i) => ({
    x: 80 + (i / 19) * (W - 160),
    y: startY + Math.sin(i * 0.8) * 30 + Math.random() * 20,
  }))

  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.strokeStyle = '#FF5722'
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach((p, i) => {
    const prev = points[i]
    const cpX = (prev.x + p.x) / 2
    ctx.bezierCurveTo(cpX, prev.y, cpX, p.y, p.x, p.y)
  })
  ctx.stroke()

  // Zone sous la courbe
  ctx.lineTo(W - 80, startY + 100)
  ctx.lineTo(80, startY + 100)
  ctx.closePath()
  ctx.fillStyle = '#FF5722'
  ctx.fill()
  ctx.restore()
}

export default function CartePartage({ seance, onFermer }) {
  const canvasRef = useRef(null)
  const [generee, setGeneree] = useState(false)
  const [partage, setPartage] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    setTimeout(() => {
      dessinerCarte(canvasRef.current, seance)
      setGeneree(true)
    }, 100)
  }, [seance])

  async function partager() {
    if (!canvasRef.current) return
    setPartage(true)

    canvasRef.current.toBlob(async (blob) => {
      const file = new File([blob], `seance-${seance.date}.png`, { type: 'image/png' })

      // Partage natif (iOS/Android)
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Ma séance Fit Tracker',
          })
        } catch (e) {
          if (e.name !== 'AbortError') telecharger(blob)
        }
      } else {
        // Fallback : téléchargement
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.95)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)' }}>
        <button onClick={onFermer} className="text-sm" style={{ color: 'var(--orange)' }}>← Retour</button>
        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Partager la séance</p>
        <div style={{ width: '60px' }} />
      </div>

      {/* Aperçu de la carte */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{
            maxHeight: '100%',
            maxWidth: '100%',
            objectFit: 'contain',
            borderRadius: '12px',
            opacity: generee ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
        {!generee && (
          <p style={{ color: 'var(--text-muted)' }}>Génération de la carte...</p>
        )}
      </div>

      {/* Boutons */}
      <div className="px-4 pb-6 flex flex-col gap-3" style={{ background: 'var(--surface)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--text-faint)' }}>
          Sur mobile, tu pourras choisir Instagram, WhatsApp ou autre
        </p>
        <button onClick={partager} disabled={!generee || partage}
          className="btn-primary py-4 text-base font-bold disabled:opacity-50">
          {partage ? 'Partage en cours...' : '📤 Partager / Télécharger'}
        </button>
      </div>
    </div>
  )
}
