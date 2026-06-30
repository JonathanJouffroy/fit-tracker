// Dessine la silhouette avec les zones musculaires actives en surbrillance orange
// Utilise les vraies images comme base et superpose les zones en canvas

// Zones musculaires avec leurs coordonnées relatives (en % de la zone image)
// Vue de FACE (image silhouette-face.png)
// L'image est 1406×788px, la silhouette est centrée ~(560-850, 80-760)
// On travaille en coordonnées normalisées 0-1 sur la zone utile de l'image

const ZONES_FACE = {
  epaules: [
    { cx: 0.355, cy: 0.275, rx: 0.055, ry: 0.04 },  // épaule gauche
    { cx: 0.645, cy: 0.275, rx: 0.055, ry: 0.04 },  // épaule droite
  ],
  pectoraux: [
    { cx: 0.44, cy: 0.335, rx: 0.055, ry: 0.055 },
    { cx: 0.56, cy: 0.335, rx: 0.055, ry: 0.055 },
  ],
  abdos: [
    { cx: 0.47, cy: 0.435, rx: 0.03, ry: 0.025 },
    { cx: 0.53, cy: 0.435, rx: 0.03, ry: 0.025 },
    { cx: 0.47, cy: 0.48, rx: 0.03, ry: 0.025 },
    { cx: 0.53, cy: 0.48, rx: 0.03, ry: 0.025 },
    { cx: 0.47, cy: 0.525, rx: 0.03, ry: 0.025 },
    { cx: 0.53, cy: 0.525, rx: 0.03, ry: 0.025 },
  ],
  biceps: [
    { cx: 0.355, cy: 0.38, rx: 0.028, ry: 0.055 },  // bras gauche
    { cx: 0.645, cy: 0.38, rx: 0.028, ry: 0.055 },  // bras droit
  ],
  triceps: [
    { cx: 0.34, cy: 0.38, rx: 0.022, ry: 0.05 },
    { cx: 0.66, cy: 0.38, rx: 0.022, ry: 0.05 },
  ],
  quadriceps: [
    { cx: 0.455, cy: 0.68, rx: 0.045, ry: 0.09 },
    { cx: 0.545, cy: 0.68, rx: 0.045, ry: 0.09 },
  ],
  fessiers: [
    { cx: 0.46, cy: 0.575, rx: 0.05, ry: 0.04 },
    { cx: 0.54, cy: 0.575, rx: 0.05, ry: 0.04 },
  ],
  mollets: [
    { cx: 0.455, cy: 0.84, rx: 0.032, ry: 0.05 },
    { cx: 0.545, cy: 0.84, rx: 0.032, ry: 0.05 },
  ],
}

// Vue de DOS (image silhouette-dos.png)
const ZONES_DOS = {
  dos: [
    { cx: 0.44, cy: 0.32, rx: 0.06, ry: 0.07 },
    { cx: 0.56, cy: 0.32, rx: 0.06, ry: 0.07 },
  ],
  epaules: [
    { cx: 0.36, cy: 0.27, rx: 0.055, ry: 0.04 },
    { cx: 0.64, cy: 0.27, rx: 0.055, ry: 0.04 },
  ],
  triceps: [
    { cx: 0.35, cy: 0.39, rx: 0.03, ry: 0.06 },
    { cx: 0.65, cy: 0.39, rx: 0.03, ry: 0.06 },
  ],
  fessiers: [
    { cx: 0.45, cy: 0.575, rx: 0.055, ry: 0.055 },
    { cx: 0.55, cy: 0.575, rx: 0.055, ry: 0.055 },
  ],
  ischios: [
    { cx: 0.455, cy: 0.685, rx: 0.045, ry: 0.075 },
    { cx: 0.545, cy: 0.685, rx: 0.045, ry: 0.075 },
  ],
  mollets: [
    { cx: 0.455, cy: 0.845, rx: 0.032, ry: 0.05 },
    { cx: 0.545, cy: 0.845, rx: 0.032, ry: 0.05 },
  ],
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

// Dessine les zones actives sur une vue (face ou dos)
function dessinerZones(ctx, zones, zonesActives, x, y, w, h) {
  Object.entries(zones).forEach(([nom, ellipses]) => {
    if (!zonesActives.includes(nom)) return
    ellipses.forEach(({ cx, cy, rx, ry }) => {
      const px = x + cx * w
      const py = y + cy * h
      const prx = rx * w
      const pry = ry * h

      // Halo orange
      ctx.save()
      ctx.globalAlpha = 0.25
      const grad = ctx.createRadialGradient(px, py, 0, px, py, Math.max(prx, pry) * 1.8)
      grad.addColorStop(0, '#FF5722')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(px, py, prx * 1.8, pry * 1.8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Zone principale
      ctx.save()
      ctx.globalAlpha = 0.75
      const gradPrincipal = ctx.createRadialGradient(px, py * 0.98, 0, px, py, Math.max(prx, pry))
      gradPrincipal.addColorStop(0, '#FF8C00')
      gradPrincipal.addColorStop(0.6, '#FF5722')
      gradPrincipal.addColorStop(1, '#CC3300')
      ctx.fillStyle = gradPrincipal
      ctx.beginPath()
      ctx.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2)
      ctx.fill()
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
