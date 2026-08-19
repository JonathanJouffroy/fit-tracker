// Parse robuste pour les modèles Groq avec raisonnement (<think>...</think>)
export function parseGroqJson(texte) {
  // 1. Supprimer le bloc <think>...</think> si présent
  let clean = texte.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  // 2. Supprimer les balises markdown
  clean = clean.replace(/```json|```/g, '').trim()
  // 3. Essai direct
  try { return JSON.parse(clean) } catch {}
  // 4. Extraire le premier tableau JSON
  const arrMatch = clean.match(/\[[\s\S]*\]/)
  if (arrMatch) try { return JSON.parse(arrMatch[0]) } catch {}
  // 5. Extraire le premier objet JSON
  const objMatch = clean.match(/\{[\s\S]*\}/)
  if (objMatch) try { return JSON.parse(objMatch[0]) } catch {}
  throw new Error('Impossible de parser la réponse JSON')
}
