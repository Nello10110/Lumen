import type fr from '../fr/supprimerFoyer'
import type { Structure } from '../../types'

/** Italien — espace « supprimerFoyer » (backlog § BK.2c), traduit depuis le français. */
const supprimerFoyer: Structure<typeof fr> = {
  carteTitre: "Elimina il nucleo",
  carteExplication: "Elimina definitivamente il nucleo stesso: il suo patrimonio, le sue impostazioni, i suoi link di condivisione e i suoi inviti. A differenza del ripristino, il nucleo non esiste più. Nessun account viene eliminato.",
  ouvrir: "Elimina il nucleo…",
  titre: "Eliminare il nucleo?",
  efface: "Verranno cancellati definitivamente",
  aucunPatrimoine: "Nessun dato di patrimonio.",
  liensPartage: { one: "{n} link di condivisione", other: "{n} link di condivisione" },
  invitations: { one: "{n} invito", other: "{n} inviti" },
  comptesTitre: "Gli account del nucleo",
  comptesConserves: { one: "Il nucleo ha {n} account (il Suo compreso). Nessuno viene eliminato.", other: "Il nucleo ha {n} account (il Suo compreso). Nessuno viene eliminato." },
  sansFoyer: { one: "{n} account resterà senza nucleo: potrà entrare in un nucleo con un invito o crearne uno proprio.", other: "{n} account resteranno senza nucleo: potranno entrare in un nucleo con un invito o crearne uno proprio." },
  gardentUnFoyer: { one: "{n} account appartiene anche a un altro nucleo, che mantiene.", other: "{n} account appartengono anche a un altro nucleo, che mantengono." },
  apres: "Poi arriverà in un altro dei Suoi nuclei, se ne ha uno, altrimenti nella schermata «nessun nucleo».",
  exportTitre: "Prima esporti i Suoi dati",
  exportExplication: "Il file di esportazione è l’unico modo per conservare questo patrimonio: potrà essere importato in un altro nucleo. Il nucleo eliminato può restare nei backup cifrati del server fino alla loro rotazione.",
  exporter: "Esporta i miei dati (JSON)",
  exportFait: "Esportazione scaricata.",
  irreversible: "Questa azione è irreversibile.",
  confirmationLabel: "Per confermare, digiti esattamente «{phrase}» qui sotto",
  confirmationAria: "Conferma dell’eliminazione del nucleo",
  annuler: "Annulla",
  supprimer: "Elimina definitivamente il nucleo",
  suppressionEnCours: "Eliminazione in corso…",
}

export default supprimerFoyer
