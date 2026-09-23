/** Textes français — espace « comptesPage » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const comptesPage = {
  comptes: "Comptes",
  etablissement: "Établissement",
  ajouterUnCompte: "Ajouter un compte",
  tousLesComptesDuFoyer: "Tous les comptes du foyer — compte courant, PEA, compte-titres, assurance-vie, immobilier, épargne — groupés par établissement, avec leur solde. Clique sur un compte pour voir le détail, modifier une ligne d'épargne ou lui ajouter une valorisation, et définir une répartition entre détenteurs pour tout le compte en une fois.",
  unCompteEstUnContenant: "Un compte est un contenant (votre PEA, votre livret, le compte de votre appartement) ; les lignes de patrimoine sont ce qu'il contient. Clique sur un compte pour voir ses lignes.",
  quEstCeQuUn: "Qu'est-ce qu'un compte ?",
  valeurEpargneTotale: "Valeur épargne totale",
  versementMensuelTotal: "Versement mensuel total",
  additionneAuPreremplissageDuSimulateur: "additionné au préremplissage du Simulateur",
  aucunCompteDeclare: "Aucun compte déclaré.",
  creeUnCompteCiDessus: "Crée un compte ci-dessus (vide, ou une ligne d'épargne en choisissant un type), ou rattaches-en un directement depuis Actifs lors de l'ajout d'une position.",
  renommerChangerLeLogo: "Renommer, changer le logo",
  ceNEstPasUn: "Ce n'est pas un compte, mais le regroupement des lignes de votre patrimoine qui ne sont rattachées à aucun compte. Pour les ranger, ouvrez la ligne concernée depuis Actifs et choisissez-lui un compte.",
  sansCompte: "Sans compte",
  miseAJourLe: "· mise à jour le",
  repartitionEntreDetenteursIncompleteSur: "Répartition entre détenteurs incomplète sur au moins une ligne de ce compte",
  repartitionEntreDetenteursNonRenseignee: "Répartition entre détenteurs non renseignée pour ce compte — clique pour la définir",
  etablissements: "Établissements",
  fermer: "Fermer",
  sansEtablissement: "Sans établissement",
  modifierEtablissementAria: "Modifier l'établissement {nom}",
  nLignes: { one: "{n} ligne", other: "{n} lignes" },
} as const

export default comptesPage
