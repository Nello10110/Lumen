/** Textes français — espace « etablissementEditModal » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const etablissementEditModal = {
  aucunLogoUnBadgePar: "Aucun logo — un badge par défaut est affiché.",
  nom: "Nom",
  enregistrement: "Enregistrement…",
  renommer: "Renommer",
  rattacherAuCatalogue: "Rattacher au catalogue",
  cetEtablissementAEteCree: "Cet établissement a été créé sans être relié à un établissement connu — c'est ce qui l'empêche d'avoir un badge coloré ou d'aller chercher un logo officiel. Choisissez-le ci-dessous s'il en fait partie (le nom n'est pas modifié).",
  logo: "Logo",
  disponibleUniquementPourUnEtablissement: "Disponible uniquement pour un établissement choisi dans le catalogue — téléversez une image ou saisissez une adresse.",
  recuperation: "Récupération…",
  recupererLeLogoOfficiel: "Récupérer le logo officiel",
  envoi: "Envoi…",
  televerserUneImage: "Téléverser une image",
  retirerLeLogo: "Retirer le logo",
  imageDuLogo: "Image du logo",
  adresseDUneImageLe: "Adresse d'une image (le serveur la télécharge et la met en cache)",
  httpsExempleFrLogoPng: "https://exemple.fr/logo.png",
  utiliserCetteAdresse: "Utiliser cette adresse",
  touteImageEstReconvertieEn: "Toute image est reconvertie en PNG (128 px) côté serveur. Une adresse saisie est re-téléchargée chaque semaine par la tâche planifiée « Logos des établissements » ; une image téléversée n'est, elle, jamais remplacée automatiquement.",
  fermer: "Fermer",
  sourceCatalogue: "récupéré sur le site officiel",
  sourceUrl: "récupéré depuis une adresse",
  sourceUpload: "image téléversée",
  logoSource: "Logo {source}",
} as const

export default etablissementEditModal
