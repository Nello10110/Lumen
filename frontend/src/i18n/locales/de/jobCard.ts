import type fr from '../fr/jobCard'
import type { Structure } from '../../types'

/** Allemand — espace « jobCard » (backlog § BL.2), traduit depuis le français. */
const jobCard: Structure<typeof fr> = {
  execution: "Wird ausgeführt...",
  active: "Aktiviert",
  toutesLes: "Alle",
  h: "h",
  lancerMaintenant: "Jetzt ausführen",
  forcerAussiLesCotationsIndisponibles: "Auch nicht verfügbare Kurse erzwingen",
  derniereExecution: "Letzte Ausführung:",
  succes: "Erfolg",
  echec: "Fehlgeschlagen",
  titreForcerNonCotables: "Fragt auch die üblicherweise übersprungenen Positionen erneut ab (z. B. Bricks.co), die als nie notiert bekannt sind. Selten nützlich — vor allem im Zweifelsfall.",
  executionProgression: "Wird ausgeführt... ({traitees} / {total} Positionen)",
  job: { market_data_refresh: {"libelle": "Aktualisierung der Marktdaten", "description": "Kurse, ETF-Zusammensetzung und wichtigste Basiswerte für alle Positionen des Portfolios."}, justetf_refresh: {"libelle": "Geografische/sektorale Zusammensetzung (justETF)", "description": "Tatsächliche Länder-/Sektorverteilung der gehaltenen ETFs, abgerufen von justETF.com. Standardmäßig wöchentlich: Die Zusammensetzung eines ETF ändert sich langsam, und justETF bietet bei Sperren keinen Support."}, sauvegarde_chiffree: {"libelle": "Verschlüsselte Sicherung", "description": "Verschlüsselte Kopie der Datenbank, abgelegt in backend/sauvegardes/ (die 10 neuesten werden behalten). Erfordert die Umgebungsvariable PATRIMOINE_BACKUP_KEY auf dem Server — ohne sie schlägt dieser Job sauber fehl (unten sichtbar), ohne die anderen zu beeinträchtigen."}, logos_refresh: {"libelle": "Logos der Institute", "description": "Lädt die Logos der Institute erneut von ihrer offiziellen Website (oder von der von Ihnen eingegebenen Adresse). Standardmäßig wöchentlich: Ein Logo ändert sich selten, und nichts wird überschrieben, wenn sich das Bild nicht geändert hat. Ein von Ihnen selbst hochgeladenes Logo wird nie angetastet."}, cours_historiques: {"libelle": "Kurshistorie", "description": "Ergänzt die wöchentliche Kurshistorie der gehaltenen Titel und lädt nur die seit dem letzten Mal vergangenen Wochen herunter. Dadurch erscheinen die Entwicklungsdiagramme sofort: Die Downloadzeit wird hier im Hintergrund aufgewendet statt beim Öffnen eines Bildschirms."} },
}

export default jobCard
