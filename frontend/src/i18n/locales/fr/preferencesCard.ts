/** Textes français — espace « preferencesCard » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const preferencesCard = {
  methodeDeCalculDuCout: "Méthode de calcul du coût de revient",
  attentionChangerDeMethodeRecalcule: "Attention : changer de méthode recalcule immédiatement le prix de revient et les gains réalisés de TOUT le portefeuille.",
  declarationDePatrimoine: "Déclaration de patrimoine",
  tauxDImpositionSaisiIci: "Taux d'imposition saisi ici, repris tel quel dans la déclaration de patrimoine (onglet Exporter) — l'application ne réalise aucun calcul fiscal, cette valeur est celle que tu renseignes.",
  tauxDImposition: "Taux d'imposition",
  nonRenseigne: "non renseigné",
  comparaisonPatrimoniale: "Comparaison patrimoniale",
  sertUniquementAChoisirLa: "Sert uniquement à choisir la bonne tranche d'âge de comparaison au patrimoine médian français (écran Analyse) — jamais stockée ni utilisée ailleurs.",
  anneeDeNaissance: "Année de naissance",
  nonRenseignee: "non renseignée",
  coutMoyenPondere: "Coût moyen pondéré",
  fifo: "FIFO (premier entré, premier sorti)",
  coutMoyenPondereDescription: "Chaque vente retire le coût moyen de TOUTE la position au moment de la vente : le prix de revient reste une moyenne unique, quelle que soit l'ancienneté des titres vendus. Méthode par défaut de l'application.",
  fifoDescription: "Chaque vente consomme d'abord les titres achetés les plus anciens : le coût retiré est celui de ces titres-là, pas une moyenne. Le prix de revient restant ne reflète alors que les lots les plus récents.",
  positionsRecalculees: { one: "{n} position du portefeuille recalculée avec la nouvelle méthode.", other: "{n} positions du portefeuille recalculées avec la nouvelle méthode." },
} as const

export default preferencesCard
