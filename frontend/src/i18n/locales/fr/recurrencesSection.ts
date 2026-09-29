/** Textes français — espace « recurrencesSection » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const recurrencesSection = {
  chargesRecurrentesEtAbonnements: "Charges récurrentes et abonnements",
  detecteAutomatiquement: "Détecté automatiquement sur l'historique importé — mouvements revenant au moins deux fois sous le même libellé (les dates que la banque ajoute aux paiements par carte sont ignorées), à rythme mensuel, trimestriel ou annuel, et toujours en cours. Le coût annuel est estimé au montant actuel.",
  libelle: "Libellé",
  categorie: "Catégorie",
  periodicite: "Périodicité",
  occurrences: "Occurrences",
  montant: "Montant",
  mensuelle: "Mensuelle",
  trimestrielle: "Trimestrielle",
  annuelle: "Annuelle",
  hausseDePrix: "Hausse de prix",
  evolutionDepuis: "{pct} depuis {montant}",
  coutAnnuelEstime: "Coût annuel estimé",
  achatsFrequents: "Achats fréquents",
  achatsFrequentsAide: "Commerces ou virements qui reviennent sans rythme régulier : ils ne sont pas comptés dans les charges récurrentes.",
  totalObserve: "Total sur la période observée",
  totalAbonnements: "Abonnements et prélèvements : {annuel}/an · {mensuel}/mois",
} as const

export default recurrencesSection
