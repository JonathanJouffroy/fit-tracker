// Dessine la silhouette avec les zones musculaires actives en surbrillance orange
// Utilise les vraies images comme base et superpose les zones en canvas

// Zones musculaires avec leurs coordonnées relatives (en % de la zone image)
// Vue de FACE (image silhouette-face.png)
// L'image est 1406×788px, la silhouette est centrée ~(560-850, 80-760)
// On travaille en coordonnées normalisées 0-1 sur la zone utile de l'image

const ZONES_FACE = {
  epaules:    [{ cx: 0.28, cy: 0.22, rx: 0.09, ry: 0.05 }, { cx: 0.68, cy: 0.22, rx: 0.09, ry: 0.05 }],
  pectoraux:  [{ cx: 0.38, cy: 0.33, rx: 0.09, ry: 0.07 }, { cx: 0.58, cy: 0.33, rx: 0.09, ry: 0.07 }],
  abdos:      [{ cx: 0.42, cy: 0.43, rx: 0.06, ry: 0.04 }, { cx: 0.56, cy: 0.43, rx: 0.06, ry: 0.04 },
               { cx: 0.42, cy: 0.49, rx: 0.06, ry: 0.04 }, { cx: 0.56, cy: 0.49, rx: 0.06, ry: 0.04 },
               { cx: 0.42, cy: 0.55, rx: 0.06, ry: 0.04 }, { cx: 0.56, cy: 0.55, rx: 0.06, ry: 0.04 }],
  biceps:     [{ cx: 0.24, cy: 0.40, rx: 0.05, ry: 0.07 }, { cx: 0.73, cy: 0.38, rx: 0.05, ry: 0.07 }],
  quadriceps: [{ cx: 0.40, cy: 0.68, rx: 0.07, ry: 0.10 }, { cx: 0.60, cy: 0.68, rx: 0.07, ry: 0.10 }],
  fessiers:   [{ cx: 0.40, cy: 0.58, rx: 0.07, ry: 0.05 }, { cx: 0.58, cy: 0.58, rx: 0.07, ry: 0.05 }],
  mollets:    [{ cx: 0.40, cy: 0.84, rx: 0.05, ry: 0.06 }, { cx: 0.60, cy: 0.84, rx: 0.05, ry: 0.06 }],
}

const ZONES_DOS = {
  dos:      [{ cx: 0.38, cy: 0.30, rx: 0.09, ry: 0.09 }, { cx: 0.62, cy: 0.30, rx: 0.09, ry: 0.09 }],
  epaules:  [{ cx: 0.30, cy: 0.22, rx: 0.09, ry: 0.05 }, { cx: 0.70, cy: 0.22, rx: 0.09, ry: 0.05 }],
  triceps:  [{ cx: 0.26, cy: 0.40, rx: 0.05, ry: 0.07 }, { cx: 0.74, cy: 0.40, rx: 0.05, ry: 0.07 }],
  fessiers: [{ cx: 0.38, cy: 0.58, rx: 0.09, ry: 0.07 }, { cx: 0.62, cy: 0.58, rx: 0.09, ry: 0.07 }],
  ischios:  [{ cx: 0.38, cy: 0.70, rx: 0.07, ry: 0.08 }, { cx: 0.62, cy: 0.70, rx: 0.07, ry: 0.08 }],
  mollets:  [{ cx: 0.38, cy: 0.85, rx: 0.05, ry: 0.06 }, { cx: 0.62, cy: 0.85, rx: 0.05, ry: 0.06 }],
}

// Zones visibles sur la face vs le dos
const ZONES_VISIBLES_FACE = ['epaules', 'pectoraux', 'abdos', 'biceps', 'quadriceps', 'fessiers', 'mollets']
const ZONES_VISIBLES_DOS = ['dos', 'epaules', 'triceps', 'fessiers', 'ischios', 'mollets']

// Charge une image et retourne une Promise<HTMLImageElement>
function chargerImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Dessine les zones actives avec un effet chaleur corporelle (dégradé thermique rouge→orange→transparent)
function dessinerZones(ctx, zones, zonesActives, x, y, w, h) {
  Object.entries(zones).forEach(([nom, ellipses]) => {
    if (!zonesActives.includes(nom)) return
    ellipses.forEach(({ cx, cy, rx, ry }) => {
      const px = x + cx * w
      const py = y + cy * h
      const prx = rx * w * 1.6
      const pry = ry * h * 1.6
      const R = Math.max(prx, pry)

      ctx.save()

      // Clipping sur l'ellipse pour contenir le dégradé
      ctx.beginPath()
      ctx.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2)
      ctx.clip()

      // Transformer l'espace pour étirer le gradient circulaire en ellipse
      ctx.translate(px, py)
      if (prx !== pry) {
        ctx.scale(prx / R, pry / R)
      }

      // Gradient radial centré sur l'origine après translate
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
      grad.addColorStop(0,    'rgba(255, 40,  0, 0.95)')  // rouge vif centre
      grad.addColorStop(0.25, 'rgba(255, 70,  0, 0.85)')  // rouge-orange
      grad.addColorStop(0.5,  'rgba(255, 140, 0, 0.65)')  // orange
      grad.addColorStop(0.75, 'rgba(220, 90,  0, 0.30)')  // orange foncé
      grad.addColorStop(1.0,  'rgba(180, 50,  0, 0)')     // transparent

      ctx.fillStyle = grad
      ctx.fillRect(-R, -R, R * 2, R * 2)

      ctx.restore()
    })
  })
}

// Fonction principale exportée
export async function dessinerSilhouette(ctx, x, y, largeur, hauteur, zonesActives = [], vues = { aFace: true, aDos: true }) {
  try {
    const { aFace = true, aDos = true } = vues
    const lesDeuxVues = aFace && aDos

    const images = await Promise.all([
      aFace ? chargerImage('/silhouette-face.png') : null,
      aDos ? chargerImage('/silhouette-dos.png') : null,
    ])
    const [imgFace, imgDos] = images

    if (lesDeuxVues) {
      // Côte à côte
      const gap = 16
      const moitie = (largeur - gap) / 2

      // Face (gauche)
      ctx.drawImage(imgFace, x, y, moitie, hauteur)
      const zonesFaceActives = zonesActives.filter(z => ZONES_VISIBLES_FACE.includes(z))
      if (zonesFaceActives.length > 0) dessinerZones(ctx, ZONES_FACE, zonesFaceActives, x, y, moitie, hauteur)

      // Dos (droite)
      ctx.drawImage(imgDos, x + moitie + gap, y, moitie, hauteur)
      const zonesDosActives = zonesActives.filter(z => ZONES_VISIBLES_DOS.includes(z))
      if (zonesDosActives.length > 0) dessinerZones(ctx, ZONES_DOS, zonesDosActives, x + moitie + gap, y, moitie, hauteur)

      // Labels
      ctx.textAlign = 'center'
      ctx.font = `${Math.round(largeur * 0.04)}px system-ui,sans-serif`
      ctx.fillStyle = '#555'
      ctx.fillText('Face', x + moitie / 2, y + hauteur + 28)
      ctx.fillText('Dos', x + moitie + gap + moitie / 2, y + hauteur + 28)

    } else if (aFace) {
      // Face seule — centrée, pleine largeur
      ctx.drawImage(imgFace, x, y, largeur, hauteur)
      const zonesFaceActives = zonesActives.filter(z => ZONES_VISIBLES_FACE.includes(z))
      if (zonesFaceActives.length > 0) dessinerZones(ctx, ZONES_FACE, zonesFaceActives, x, y, largeur, hauteur)
      ctx.textAlign = 'center'
      ctx.font = `${Math.round(largeur * 0.035)}px system-ui,sans-serif`
      ctx.fillStyle = '#555'
      ctx.fillText('Vue de face', x + largeur / 2, y + hauteur + 28)

    } else if (aDos) {
      // Dos seul — centré, pleine largeur
      ctx.drawImage(imgDos, x, y, largeur, hauteur)
      const zonesDosActives = zonesActives.filter(z => ZONES_VISIBLES_DOS.includes(z))
      if (zonesDosActives.length > 0) dessinerZones(ctx, ZONES_DOS, zonesDosActives, x, y, largeur, hauteur)
      ctx.textAlign = 'center'
      ctx.font = `${Math.round(largeur * 0.035)}px system-ui,sans-serif`
      ctx.fillStyle = '#555'
      ctx.fillText('Vue de dos', x + largeur / 2, y + hauteur + 28)
    }

  } catch (e) {
    console.warn('Silhouette images not loaded:', e)
  }
}
