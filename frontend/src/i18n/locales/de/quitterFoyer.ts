import type fr from '../fr/quitterFoyer'
import type { Structure } from '../../types'

/** Allemand — espace « quitterFoyer » (backlog § BK.2b), traduit depuis le français. */
const quitterFoyer: Structure<typeof fr> = {
  menu: "Diesen Haushalt verlassen",
  titre: "Diesen Haushalt verlassen?",
  explication: "Sie haben dann keinen Zugriff mehr auf seine Daten, die im Haushalt bleiben. Um ihm erneut beizutreten, braucht es eine neue Einladung des Eigentümers.",
  dernierFoyer: "Dies ist Ihr letzter Haushalt: Sie haben keinen Zugriff auf Daten, bis Sie mit einer Einladung einem anderen Haushalt beitreten oder einen eigenen erstellen. Ihr Konto wird nicht gelöscht.",
  annuler: "Abbrechen",
  confirmer: "Haushalt verlassen",
}

export default quitterFoyer
