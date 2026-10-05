/** Textes français — espace « repartitionGlobale » : lignes non réparties entre les membres du foyer,
 * « Tout attribuer », répartition à la création, question d'import, comptes homonymes et vue d'un
 * membre au prorata de ses parts (§ BN.1, lot 3). */
const repartitionGlobale = {
  badge: "Non réparti",
  badgeAide: "Cette ligne n'a pas de parts : elle compte pour le foyer entier, mais aucun membre ne la voit dans sa vue.",
  repartir: "Répartir",
  repartirAria: "Répartir « {nom} » entre les membres du foyer",
  bandeau: {
    foyer: {
      one: "{n} ligne n'est pas encore répartie entre les membres du foyer.",
      other: "{n} lignes ne sont pas encore réparties entre les membres du foyer.",
    },
    vueMembre: "Vue de {nom} : les valeurs sont au prorata de ses parts.",
    nonComptees: {
      one: "{n} ligne non répartie n'est pas comptée.",
      other: "{n} lignes non réparties ne sont pas comptées.",
    },
    toutAttribuer: "Tout attribuer",
  },
  modale: {
    titre: "Tout attribuer",
    introduction: "Applique la même répartition à toutes les lignes qui n'en ont pas encore. Les lignes déjà réparties ne changent pas, et rien n'est modifié avant votre validation.",
    apercuTitre: "Lignes concernées",
    actifs: { one: "{n} actif", other: "{n} actifs" },
    prets: { one: "{n} prêt", other: "{n} prêts" },
    et: "et",
    rienARepartir: "Toutes les lignes sont déjà réparties.",
    choix: "Répartition à appliquer",
    appliquer: "Attribuer",
    enCours: "Attribution en cours…",
    annuler: "Annuler",
    fermer: "Fermer",
    termine: "C'est fait : {lignes} ont maintenant des parts.",
  },
  prorata: "{pct} de {valeur}",
  repartirModale: {
    titre: "Répartir « {nom} »",
    introduction: "Définit qui détient cette ligne et pour quelle part.",
    enregistrer: "Enregistrer la répartition",
    enregistree: "Répartition enregistrée.",
    fermer: "Fermer",
  },
  quiLeDetient: {
    titre: "Qui le détient",
    resumeParts: "{nom} {pct}",
    resumeAucune: "aucune part (la ligne reste au foyer entier)",
    aide: "Chaque membre du foyer détient une part de cette ligne ; sans répartition, elle ne figure dans la vue d'aucun membre.",
  },
  importQuestion: {
    titre: "À quel membre appartiennent ces lignes ?",
    aide: "Cette répartition s'applique aux lignes que cet import crée. Celles qui existent déjà gardent leurs parts.",
    dernierChoix: "Votre dernier choix pour ce foyer est repris.",
    invalide: "Complétez la répartition (100 %) pour importer.",
  },
  homonyme: {
    titre: "Un compte « {nom} » existe déjà",
    detenuPar: "Il est détenu par {membres}. Le nom d'un compte est unique dans le foyer.",
    sansMembre: "Le nom d'un compte est unique dans le foyer.",
    pourQui: "Pour quel membre ?",
    ajouter: "Ajouter {nom} à ce compte",
    renommer: "Renommer en « {nouveau} »",
    ajouteIntro: "{nom} est ajouté à ce compte : ajustez les parts puis enregistrez.",
    separateur: "—",
  },
  avisFoyerEntier: {
    analyse: "Cet écran montre le foyer entier : la vue de {nom} ne s'y applique pas (l'onglet Évolution a son propre choix de membre).",
    rapport: "Ce rapport porte sur le foyer entier : la vue de {nom} ne s'y applique pas.",
  },
  nonRepartiCompte: "Au moins une ligne de ce compte n'est pas répartie entre les membres du foyer — cliquez pour la répartir",
  membresDuCompte: "Membres du foyer de ce compte : {membres}",
} as const

export default repartitionGlobale
