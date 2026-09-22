import { useEffect, useRef } from 'react'

/** Fait réagir une section d'import à un fichier choisi AILLEURS (refonte de l'écran
 * Import, 22/09/2026) : depuis cette refonte, c'est la tuile de la source qui porte
 * la zone de dépôt, et la section ne garde que l'aperçu, le mapping et la
 * confirmation.
 *
 * Mode PILOTÉ uniquement. Les mêmes sections restent utilisables telles quelles
 * ailleurs (`ImportTransactionsSection` dans l'assistant de bienvenue), avec leur
 * propre zone de dépôt : ce hook n'est simplement pas appelé dans ce cas.
 *
 * Le garde par référence est ce qui rend le hook sûr : `traiter` est recréée à
 * chaque rendu de la section (c'est une fonction déclarée dans son corps), donc la
 * mettre en dépendance relancerait l'import en boucle. Comparer le `File` lui-même
 * est fiable — le navigateur construit un nouvel objet à chaque sélection, y compris
 * quand l'utilisateur redépose le même fichier. */
export function useFichierPilote(fichier: File | null, traiter: (fichier: File) => void): void {
  const dejaTraite = useRef<File | null>(null)
  const traiterRef = useRef(traiter)
  traiterRef.current = traiter

  useEffect(() => {
    if (!fichier || dejaTraite.current === fichier) return
    dejaTraite.current = fichier
    traiterRef.current(fichier)
  }, [fichier])
}
