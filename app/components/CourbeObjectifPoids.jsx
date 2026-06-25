'use client'

// Génère les dates entre deux dates (inclus), pas à pas quotidien
function joursEntre(dateDebut, dateFin) {
  const jours = []
  const d = new Date(dateDebut)
  const fin = new Date(dateFin)
  while (d <= fin) {
    jours.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return jours
}

function formatDateCourt(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function CourbeObjectifPoids({ mesures, poidsDepart, poidsCible, dateDebut, dateCible }) {
  if (!mesures || mesures.length === 0 || !poidsCible || !dateCible) return null

  const today = new Date().toISOString().split('T')[0]
  const dateFinAffichage = dateCible > today ? dateCible : today

  const toutesLesDates = joursEntre(dateDebut, dateFinAffichage)
  const nbJoursTotal = joursEntre(dateDebut, dateCible).length

  // Map date → poids réel mesuré
  const mesuresParDate = {}
  mesures.forEach((m) => {
    mesuresParDate[m.date_mesure] = m.poids_kg
  })

  // Trajectoire théorique : interpolation linéaire de poidsDepart → poidsCible
  function poidsTheorique(dateStr) {
    const joursDepuisDebut = joursEntre(dateDebut, dateStr).length - 1
    const ratio = nbJoursTotal > 1 ? joursDepuisDebut / (nbJoursTotal - 1) : 1
    return poidsDepart + (poidsCible - poidsDepart) * Math.min(ratio, 1)
  }

  // Valeurs min/max pour l'échelle Y
  const valeursReelles = Object.values(mesuresParDate).map(Number)
  const valeursTheo = toutesLesDates.map(poidsTheorique)
  const toutesValeurs = [...valeursReelles, ...valeursTheo, poidsDepart, poidsCible]
  const minVal = Math.floor(Math.min(...toutesValeurs) - 1)
  const maxVal = Math.ceil(Math.max(...toutesValeurs) + 1)
  const range = maxVal - minVal || 1

  const W = 300
  const H = 140
  const PAD_L = 36
  const PAD_B = 24
  const PAD_T = 8
  const PAD_R = 8
  const gW = W - PAD_L - PAD_R
  const gH = H - PAD_B - PAD_T

  function xPos(dateStr) {
    const idx = toutesLesDates.indexOf(dateStr)
    return PAD_L + (idx / Math.max(toutesLesDates.length - 1, 1)) * gW
  }

  function yPos(poids) {
    return PAD_T + gH - ((poids - minVal) / range) * gH
  }

  // Points de la trajectoire théorique (on ne prend qu'un point tous les ~7 jours pour alléger)
  const datesTheo = toutesLesDates.filter((_, i) => i % Math.max(1, Math.floor(toutesLesDates.length / 20)) === 0)
  if (!datesTheo.includes(toutesLesDates[toutesLesDates.length - 1])) {
    datesTheo.push(toutesLesDates[toutesLesDates.length - 1])
  }
  const pathTheo = datesTheo.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(d).toFixed(1)},${yPos(poidsTheorique(d)).toFixed(1)}`).join(' ')

  // Points des mesures réelles
  const datesAvecMesure = toutesLesDates.filter((d) => mesuresParDate[d] !== undefined)
  const pathReel = datesAvecMesure.length > 1
    ? datesAvecMesure.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(d).toFixed(1)},${yPos(mesuresParDate[d]).toFixed(1)}`).join(' ')
    : null

  // Ticks Y
  const nbTicks = 4
  const stepTick = Math.ceil(range / (nbTicks - 1))
  const ticks = Array.from({ length: nbTicks }, (_, i) => Math.round(minVal + i * stepTick)).filter((t) => t <= maxVal)

  // Dates à afficher sur l'axe X (début, milieu, fin)
  const ticksX = [toutesLesDates[0], toutesLesDates[Math.floor(toutesLesDates.length / 2)], toutesLesDates[toutesLesDates.length - 1]]

  const diffActuel = datesAvecMesure.length > 0
    ? (mesuresParDate[datesAvecMesure[datesAvecMesure.length - 1]] - poidsDepart).toFixed(1)
    : null
  const diffRestant = datesAvecMesure.length > 0
    ? (mesuresParDate[datesAvecMesure[datesAvecMesure.length - 1]] - poidsCible).toFixed(1)
    : (poidsDepart - poidsCible).toFixed(1)

  return (
    <div className="card mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Objectif de poids</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {poidsDepart}kg → {poidsCible}kg · {formatDateCourt(dateCible)}
          </p>
        </div>
        <div className="text-right">
          {diffActuel !== null && (
            <p className="text-sm font-bold" style={{
              color: (poidsCible < poidsDepart ? Number(diffActuel) < 0 : Number(diffActuel) > 0) ? '#22c55e' : 'var(--text-muted)'
            }}>
              {Number(diffActuel) > 0 ? '+' : ''}{diffActuel}kg
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {Math.abs(Number(diffRestant)).toFixed(1)}kg restants
          </p>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '140px' }}>
        {/* Grille Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} y1={yPos(t)} x2={W - PAD_R} y2={yPos(t)}
              stroke="var(--border)" strokeWidth="0.5" />
            <text x={PAD_L - 4} y={yPos(t) + 4} textAnchor="end"
              fontSize="9" fill="var(--text-faint)">{t}</text>
          </g>
        ))}

        {/* Axe X labels */}
        {ticksX.map((d) => (
          <text key={d} x={xPos(d)} y={H - 4} textAnchor="middle"
            fontSize="8" fill="var(--text-faint)">{formatDateCourt(d)}</text>
        ))}

        {/* Ligne pointillée : trajectoire théorique */}
        <path d={pathTheo} fill="none" stroke="var(--text-faint)"
          strokeWidth="1.5" strokeDasharray="4,3" />

        {/* Ligne pleine : poids réels */}
        {pathReel && (
          <path d={pathReel} fill="none" stroke="var(--orange)" strokeWidth="2" strokeLinecap="round" />
        )}

        {/* Points mesures réelles */}
        {datesAvecMesure.map((d) => (
          <circle key={d} cx={xPos(d)} cy={yPos(mesuresParDate[d])} r="3"
            fill="var(--orange)" />
        ))}

        {/* Point objectif */}
        <circle cx={xPos(dateCible)} cy={yPos(poidsCible)} r="4"
          fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeDasharray="2,1" />
      </svg>

      <div className="flex gap-4 mt-2 justify-center text-xs" style={{ color: 'var(--text-faint)' }}>
        <span className="flex items-center gap-1">
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--orange)" strokeWidth="2" /></svg>
          Poids réel
        </span>
        <span className="flex items-center gap-1">
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="var(--text-faint)" strokeWidth="1.5" strokeDasharray="3,2" /></svg>
          Trajectoire cible
        </span>
      </div>
    </div>
  )
}
