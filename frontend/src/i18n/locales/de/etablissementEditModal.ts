import type fr from '../fr/etablissementEditModal'
import type { Structure } from '../../types'

/** Allemand — espace « etablissementEditModal » (backlog § BL.2), traduit depuis le français. */
const etablissementEditModal: Structure<typeof fr> = {
  aucunLogoUnBadgePar: "Kein Logo — ein Standardabzeichen wird angezeigt.",
  nom: "Name",
  enregistrement: "Wird gespeichert…",
  renommer: "Umbenennen",
  rattacherAuCatalogue: "Mit dem Katalog verknüpfen",
  cetEtablissementAEteCree: "Dieses Institut wurde ohne Verknüpfung zu einem bekannten Institut angelegt — deshalb hat es kein farbiges Abzeichen und kann kein offizielles Logo abrufen. Wählen Sie es unten aus, falls es dazugehört (der Name bleibt unverändert).",
  logo: "Logo",
  disponibleUniquementPourUnEtablissement: "Nur für ein aus dem Katalog gewähltes Institut verfügbar — laden Sie ein Bild hoch oder geben Sie eine Adresse ein.",
  recuperation: "Wird abgerufen…",
  recupererLeLogoOfficiel: "Offizielles Logo abrufen",
  envoi: "Wird hochgeladen…",
  televerserUneImage: "Bild hochladen",
  retirerLeLogo: "Logo entfernen",
  imageDuLogo: "Logobild",
  adresseDUneImageLe: "Adresse eines Bildes (der Server lädt es herunter und speichert es zwischen)",
  httpsExempleFrLogoPng: "https://beispiel.de/logo.png",
  utiliserCetteAdresse: "Diese Adresse verwenden",
  touteImageEstReconvertieEn: "Jedes Bild wird auf dem Server in PNG (128 px) umgewandelt. Eine eingegebene Adresse wird jede Woche von der geplanten Aufgabe „Logos der Institute“ neu geladen; ein hochgeladenes Bild wird nie automatisch ersetzt.",
  fermer: "Schließen",
  sourceCatalogue: "von der offiziellen Website abgerufen",
  sourceUrl: "von einer Adresse abgerufen",
  sourceUpload: "hochgeladenes Bild",
  logoSource: "Logo {source}",
}

export default etablissementEditModal
