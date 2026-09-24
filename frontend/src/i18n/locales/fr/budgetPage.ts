/** Textes français — espace « budgetPage » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const budgetPage = {
  nonDepense: "Non dépensé",
  budget: "Budget",
  periode: "Période",
  au: "au",
  laDateDeFinDoit: "La date de fin doit être postérieure ou égale à la date de début.",
  aucunMouvementBancaireImportePour: "Aucun mouvement bancaire importé pour cette période.",
  importeUnReleveCsvOfx: "Importe un relevé (CSV, OFX ou QIF) depuis l'écran Import.",
  disponibleSurLaPeriode: "Disponible sur la période",
  dEntrees: "d'entrées −",
  deSorties: "de sorties",
  depensesRecurrentesMois: "Dépenses récurrentes / mois",
  estimeSurLes3Derniers: "estimé sur les 3 derniers mois",
  tauxDEpargneReel: "Taux d'épargne réel",
  sortiesCategorieEpargneEntrees: "sorties catégorie « Épargne » / entrées",
  resteAVivre: "Reste à vivre",
  entreesLogementChargesRecurrentes: "entrées − logement − charges récurrentes",
  tauxDEpargneIndisponibleCree: "Taux d'épargne indisponible : crée ou renomme une catégorie « Épargne » ci-dessous. ",
  resteAVivreIndisponibleCree: "Reste à vivre indisponible : crée ou renomme une catégorie « Logement » ci-dessous.",
  modeMensuel: "Mensuel",
  modeAnnuel: "Annuel",
  modePersonnalise: "Personnalisé",
  periodeDuAu: "{debut} au {fin}",
} as const

export default budgetPage
