/** Textes français — espace « editeurRepartition » : le corps commun des éditeurs de
 * répartition enregistrable (compte, prêt, bien — § BN.1, lot 2). */
const editeurRepartition = {
  erreurMembres: "Impossible de charger les membres du foyer : {erreur}",
  proposition: "Aucune répartition n'est enregistrée : voici une proposition à parts égales. Elle ne s'applique qu'une fois enregistrée.",
  divergente: "Les lignes de ce compte n'ont pas toutes la même répartition. Enregistrer ci-dessous les remplacera toutes par celle-ci.",
  enregistrement: "Enregistrement...",
} as const

export default editeurRepartition
