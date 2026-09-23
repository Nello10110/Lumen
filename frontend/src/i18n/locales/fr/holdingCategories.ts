/** Textes français — espace « holdingCategories » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const holdingCategories = {
  decoteAnnuelle: "Décote annuelle (%)",
  tauxDInteretAnnuel: "Taux d'intérêt annuel (%)",
  onglet: {
    tous: "Tous", actions: "Actions", etf: "ETF", obligations: "Obligations", privateEquity: "Private Equity",
    crypto: "Crypto", immobilierEpargne: "Immobilier & Épargne", autres: "Autres",
  },
  type: {
    nonPrecise: "Non précisé", action: "Action", etfFonds: "ETF / Fonds", crypto: "Crypto", obligation: "Obligation",
    privateEquity: "Private Equity", immobilier: "Immobilier", scpi: "SCPI", assuranceVie: "Assurance-vie",
    per: "PER / Épargne retraite", compteCourant: "Compte courant",
    epargneReglementee: "Épargne réglementée (Livret A, LDDS...)", epargneSalariale: "Épargne salariale (PEE, PERCO...)",
    vehicule: "Véhicule", autreActif: "Autre actif",
  },
  aidePrixRevient: "Montant investi à l'achat. Pour une action/ETF importé, calculé automatiquement à partir de vos transactions ; pour une ligne saisie à la main (immobilier, assurance-vie...), à renseigner vous-même. Reste une base fixe, utilisée pour calculer votre gain ou perte.",
  aideValeurEstimee: "Valeur actuelle du bien, à mettre à jour vous-même (estimation d'agence, avis de valeur...) — concerne uniquement les lignes valorisées manuellement (immobilier, SCPI, assurance-vie...). Remplace alors le calcul prix × quantité. Chaque changement est conservé dans l'historique, jamais écrasé silencieusement.",
} as const

export default holdingCategories
