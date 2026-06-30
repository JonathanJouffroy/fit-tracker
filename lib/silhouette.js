// Dessine une silhouette humaine stylisée sur un canvas 2D avec les zones travaillées en surbrillance
// Vue de face, proportions simplifiées. Coordonnées pensées pour un canvas de taille variable (cx, cy = centre).

export function dessinerSilhouette(ctx, x, y, largeur, hauteur, zonesActives = []) {
  const actif = (zone) => zonesActives.includes(zone)
  const couleurActif = '#FF5722'
  const couleurInactif = '#2a2a2a'
  const couleurContour = '#3a3a3a'

  // Échelle : la silhouette est dessinée sur une grille 200x400, on la scale ensuite
  const scaleX = largeur / 200
  const scaleY = hauteur / 400
  const ox = x
  const oy = y

  function pt(px, py) { return [ox + px * scaleX, oy + py * scaleY] }

  function zone(nom, pathFn) {
    ctx.fillStyle = actif(nom) ? couleurActif : couleurInactif
    ctx.globalAlpha = actif(nom) ? 0.95 : 0.5
    pathFn()
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.save()
  ctx.lineJoin = 'round'

  // ---- TÊTE ----
  ctx.beginPath()
  const [hx, hy] = pt(100, 25)
  ctx.ellipse(hx, hy, 18 * scaleX, 22 * scaleY, 0, 0, Math.PI * 2)
  ctx.fillStyle = couleurInactif
  ctx.globalAlpha = 0.5
  ctx.fill()
  ctx.globalAlpha = 1

  // ---- COU ----
  ctx.beginPath()
  const [c1x, c1y] = pt(92, 44)
  const [c2x, c2y] = pt(108, 44)
  const [c3x, c3y] = pt(108, 58)
  const [c4x, c4y] = pt(92, 58)
  ctx.moveTo(c1x, c1y); ctx.lineTo(c2x, c2y); ctx.lineTo(c3x, c3y); ctx.lineTo(c4x, c4y)
  ctx.closePath()
  ctx.fillStyle = couleurInactif
  ctx.globalAlpha = 0.5
  ctx.fill()
  ctx.globalAlpha = 1

  // ---- ÉPAULES (deltoïdes) ----
  zone('epaules', () => {
    ctx.beginPath()
    const [lx, ly] = pt(60, 62)
    ctx.ellipse(lx, ly, 16 * scaleX, 14 * scaleY, -0.3, 0, Math.PI * 2)
    ctx.moveTo(lx, ly)
    const [rx, ry] = pt(140, 62)
    ctx.ellipse(rx, ry, 16 * scaleX, 14 * scaleY, 0.3, 0, Math.PI * 2)
  })

  // ---- PECTORAUX ----
  zone('pectoraux', () => {
    ctx.beginPath()
    const [x1, y1] = pt(72, 64)
    ctx.moveTo(x1, y1)
    const [x2, y2] = pt(128, 64)
    ctx.lineTo(x2, y2)
    const [x3, y3] = pt(124, 100)
    ctx.lineTo(x3, y3)
    const [x4, y4] = pt(100, 108)
    ctx.lineTo(x4, y4)
    const [x5, y5] = pt(76, 100)
    ctx.lineTo(x5, y5)
    ctx.closePath()
  })

  // ---- ABDOS ----
  zone('abdos', () => {
    ctx.beginPath()
    const [x1, y1] = pt(82, 108)
    ctx.moveTo(x1, y1)
    const [x2, y2] = pt(118, 108)
    ctx.lineTo(x2, y2)
    const [x3, y3] = pt(112, 160)
    ctx.lineTo(x3, y3)
    const [x4, y4] = pt(88, 160)
    ctx.lineTo(x4, y4)
    ctx.closePath()
  })

  // ---- BICEPS (bras gauche + droit) ----
  zone('biceps', () => {
    ctx.beginPath()
    const [lx1, ly1] = pt(54, 70)
    ctx.moveTo(lx1, ly1)
    const [lx2, ly2] = pt(66, 70)
    ctx.lineTo(lx2, ly2)
    const [lx3, ly3] = pt(62, 110)
    ctx.lineTo(lx3, ly3)
    const [lx4, ly4] = pt(50, 110)
    ctx.lineTo(lx4, ly4)
    ctx.closePath()

    ctx.moveTo(...pt(134, 70))
    const [rx2, ry2] = pt(146, 70)
    ctx.lineTo(rx2, ry2)
    const [rx3, ry3] = pt(150, 110)
    ctx.lineTo(rx3, ry3)
    const [rx4, ry4] = pt(138, 110)
    ctx.lineTo(rx4, ry4)
    ctx.closePath()
  })

  // ---- TRICEPS (face arrière simplifiée, on les place légèrement décalés) ----
  zone('triceps', () => {
    ctx.beginPath()
    const [lx1, ly1] = pt(48, 72)
    ctx.moveTo(lx1, ly1)
    const [lx2, ly2] = pt(54, 72)
    ctx.lineTo(lx2, ly2)
    const [lx3, ly3] = pt(50, 108)
    ctx.lineTo(lx3, ly3)
    const [lx4, ly4] = pt(44, 108)
    ctx.lineTo(lx4, ly4)
    ctx.closePath()

    ctx.moveTo(...pt(146, 72))
    const [rx2, ry2] = pt(152, 72)
    ctx.lineTo(rx2, ry2)
    const [rx3, ry3] = pt(156, 108)
    ctx.lineTo(rx3, ry3)
    const [rx4, ry4] = pt(150, 108)
    ctx.lineTo(rx4, ry4)
    ctx.closePath()
  })

  // ---- AVANT-BRAS (neutre, toujours visible en gris) ----
  ctx.beginPath()
  ctx.fillStyle = couleurInactif
  ctx.globalAlpha = 0.5
  const [fl1x, fl1y] = pt(50, 110)
  ctx.moveTo(fl1x, fl1y)
  ctx.lineTo(...pt(62, 110))
  ctx.lineTo(...pt(58, 150))
  ctx.lineTo(...pt(48, 150))
  ctx.closePath()
  ctx.moveTo(...pt(138, 110))
  ctx.lineTo(...pt(150, 110))
  ctx.lineTo(...pt(152, 150))
  ctx.lineTo(...pt(142, 150))
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  // ---- DOS (visible sur les côtés, zone large en arrière-plan des bras) ----
  zone('dos', () => {
    ctx.beginPath()
    ctx.moveTo(...pt(68, 66))
    ctx.lineTo(...pt(76, 66))
    ctx.lineTo(...pt(80, 105))
    ctx.lineTo(...pt(70, 105))
    ctx.closePath()
    ctx.moveTo(...pt(124, 66))
    ctx.lineTo(...pt(132, 66))
    ctx.lineTo(...pt(130, 105))
    ctx.lineTo(...pt(120, 105))
    ctx.closePath()
  })

  // ---- FESSIERS / HANCHES ----
  zone('fessiers', () => {
    ctx.beginPath()
    ctx.moveTo(...pt(82, 160))
    ctx.lineTo(...pt(118, 160))
    ctx.lineTo(...pt(116, 180))
    ctx.lineTo(...pt(84, 180))
    ctx.closePath()
  })

  // ---- QUADRICEPS (cuisses) ----
  zone('quadriceps', () => {
    ctx.beginPath()
    ctx.moveTo(...pt(82, 182))
    ctx.lineTo(...pt(98, 182))
    ctx.lineTo(...pt(96, 250))
    ctx.lineTo(...pt(80, 250))
    ctx.closePath()
    ctx.moveTo(...pt(102, 182))
    ctx.lineTo(...pt(118, 182))
    ctx.lineTo(...pt(120, 250))
    ctx.lineTo(...pt(104, 250))
    ctx.closePath()
  })

  // ---- ISCHIOS (arrière cuisse, légèrement décalé) ----
  zone('ischios', () => {
    ctx.beginPath()
    ctx.moveTo(...pt(78, 184))
    ctx.lineTo(...pt(86, 184))
    ctx.lineTo(...pt(84, 248))
    ctx.lineTo(...pt(76, 248))
    ctx.closePath()
    ctx.moveTo(...pt(114, 184))
    ctx.lineTo(...pt(122, 184))
    ctx.lineTo(...pt(124, 248))
    ctx.lineTo(...pt(116, 248))
    ctx.closePath()
  })

  // ---- MOLLETS ----
  zone('mollets', () => {
    ctx.beginPath()
    ctx.moveTo(...pt(82, 252))
    ctx.lineTo(...pt(96, 252))
    ctx.lineTo(...pt(94, 310))
    ctx.lineTo(...pt(84, 310))
    ctx.closePath()
    ctx.moveTo(...pt(104, 252))
    ctx.lineTo(...pt(118, 252))
    ctx.lineTo(...pt(116, 310))
    ctx.lineTo(...pt(106, 310))
    ctx.closePath()
  })

  // ---- PIEDS (neutre) ----
  ctx.beginPath()
  ctx.fillStyle = couleurInactif
  ctx.globalAlpha = 0.5
  ctx.ellipse(...pt(88, 320), 10 * scaleX, 6 * scaleY, 0, 0, Math.PI * 2)
  ctx.moveTo(...pt(112, 320))
  ctx.ellipse(...pt(112, 320), 10 * scaleX, 6 * scaleY, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // ---- MAINS (neutre) ----
  ctx.beginPath()
  ctx.fillStyle = couleurInactif
  ctx.globalAlpha = 0.5
  ctx.ellipse(...pt(53, 156), 6 * scaleX, 8 * scaleY, 0, 0, Math.PI * 2)
  ctx.moveTo(...pt(147, 156))
  ctx.ellipse(...pt(147, 156), 6 * scaleX, 8 * scaleY, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.restore()
}
