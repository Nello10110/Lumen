/** Textes français — espace « resultatImport » (backlog § BL.2) : comptes-rendus
 * partagés par les sections d'import. Pluriels réels ({one, other}) plutôt que
 * « ligne(s) », qui ne se traduit pas : chaque langue a ses propres règles d'accord. */
const resultatImport = {
  operationsImportees: { one: "{n} opération importée", other: "{n} opérations importées" },
  transactionsImportees: { one: "{n} transaction importée", other: "{n} transactions importées" },
  mouvementsImportes: { one: "{n} mouvement importé", other: "{n} mouvements importés" },
  misesAJour: { one: "{n} mise à jour", other: "{n} mises à jour" },
  dejaPresentesInchangees: { one: "{n} déjà présente et inchangée", other: "{n} déjà présentes et inchangées" },
  dejaPresents: { one: "{n} déjà présent", other: "{n} déjà présents" },
  lignesIllisiblesIgnorees: { one: "{n} ligne illisible ignorée", other: "{n} lignes illisibles ignorées" },
  lignesHorsInvestissementIgnorees: { one: "{n} ligne hors suivi d'investissement ignorée", other: "{n} lignes hors suivi d'investissement ignorées" },
  lignesHorsAchatVenteIgnorees: { one: "{n} ligne hors achat/vente ignorée", other: "{n} lignes hors achat/vente ignorées" },
  positionsRecalculees: { one: "{n} position recalculée dans le portefeuille", other: "{n} positions recalculées dans le portefeuille" },
  comptesCrees: { one: "{n} compte créé", other: "{n} comptes créés" },
  anomaliesDetectees: { one: "{n} anomalie détectée (vente supérieure à la quantité détenue) — position bornée à 0, voir les journaux serveur.", other: "{n} anomalies détectées (vente supérieure à la quantité détenue) — positions bornées à 0, voir les journaux serveur." },
  lignesManuellesRemplacees: { one: "{n} ligne saisie manuellement remplacée par la position recalculée depuis le grand livre (même ticker) — le grand livre fait foi.", other: "{n} lignes saisies manuellement remplacées par la position recalculée depuis le grand livre (même ticker) — le grand livre fait foi." },
  lignesLues: { one: "{n} ligne lue", other: "{n} lignes lues" },
  nonConfirmeesIgnorees: { one: "{n} non confirmée ignorée", other: "{n} non confirmées ignorées" },
  operationsHorsAchatVenteIgnorees: { one: "{n} opération hors achat/vente ignorée", other: "{n} opérations hors achat/vente ignorées" },
  mouvementsHorsBourseExclus: { one: "{n} mouvement hors suivi boursier exclu.", other: "{n} mouvements hors suivi boursier exclus." },
  categorisesAutomatiquement: { one: "{n} catégorisé automatiquement par tes règles.", other: "{n} catégorisés automatiquement par tes règles." },
  biensDetectes: { one: "{n} bien détecté, {montant} investi au total", other: "{n} biens détectés, {montant} investis au total" },
  lignesHorsInvestissementNonImportees: { one: "{n} ligne hors suivi d'investissement non importée (crédit, prélèvement à la source, bonus...)", other: "{n} lignes hors suivi d'investissement non importées (crédit, prélèvement à la source, bonus...)" },
  lignesImportees: { one: "{n} ligne importée", other: "{n} lignes importées" },
  ignorees: { one: "{n} ignorée", other: "{n} ignorées" },
  nOperations: { one: "{n} opération", other: "{n} opérations" },
  nLignes: { one: "{n} ligne", other: "{n} lignes" },
} as const

export default resultatImport
