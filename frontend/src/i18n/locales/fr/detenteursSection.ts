/** Textes français — espace « detenteursSection » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const detenteursSection = {
  detenteurs: "Détenteurs",
  repartitionDeCetteLigneEntre: "Répartition de cette ligne entre les personnes déclarées dans Réglages — la somme doit faire 100 % (ou rester à 0 % pour ne pas répartir, 100 % foyer implicite).",
  cetteLigneAppartientAuCompte: "Cette ligne appartient au compte",
  definisLaPlutotUneSeule: "— définis-la plutôt une seule fois pour tout le compte depuis sa fiche, si les autres lignes du compte doivent avoir la même répartition.",
  detenteur: "Détenteur",
  quotite: "Quotité",
  laPartDuGateauQui: "La part du gâteau qui revient à chaque personne sur ce bien ou cet emprunt. La somme des quotités d'une ligne fait toujours 100 %.",
  valeurDeLActifRevenant: "Valeur de l'actif revenant à ce détenteur, au prorata de sa quotité, SANS déduire l'emprunt.",
  partDetenue: "Part détenue",
  partDetenueMoinsLaPart: "Part détenue MOINS la part du capital restant dû de l'emprunt rattaché. Identique à la part détenue si aucun emprunt n'est rattaché à cette ligne.",
  partNette: "Part nette",
  enregistrer: "Enregistrer",
  totalActuel: "Total actuel :",
  doitFaire100: "% (doit faire 100 %)",
  erreurDetenteurs: "Impossible de charger les détenteurs : {erreur}",
} as const

export default detenteursSection
