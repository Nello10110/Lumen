import { api } from '../api/client'

/** Télécharge l'export JSON de tout le patrimoine du foyer (backlog Y.1).
 *
 * Piloté côté client plutôt qu'un simple `<a href>` : la route exige l'en-tête
 * d'authentification, qu'une navigation directe du navigateur ne porterait pas — même
 * raison que la déclaration PDF. Partagé par la carte « Sauvegarde complète » et par la
 * suppression du foyer, qui propose d'exporter avant d'effacer. Laisse remonter l'erreur. */
export async function telechargerExportDonnees(): Promise<void> {
  const blob = await api.downloadExportDonnees()
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = `patrimoine-export-${new Date().toISOString().slice(0, 10)}.json`
  lien.click()
  URL.revokeObjectURL(url)
}
