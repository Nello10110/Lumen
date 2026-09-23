/** Textes français — espace « qualiteDonneesCard » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const qualiteDonneesCard = {
  qualiteDesDonnees: "Qualité des données",
  estimeeParIndice: "{pct}% de la valeur du portefeuille ({valeur}) a une répartition géographique estimée à partir de l'indice suivi par le fonds, faute de composition détaillée disponible.",
  nonCategorisee: "{pct}% de la valeur du portefeuille ({valeur}) n'a aucune donnée géographique disponible et apparaît en \"Non catégorisé\".",
  sansCotation: "{valeur} ({pct}%) sont valorisés à leur coût de revient faute de cotation disponible — cette valeur entre telle quelle dans le score de diversification et dans les montants de rééquilibrage en euros.",
} as const

export default qualiteDonneesCard
