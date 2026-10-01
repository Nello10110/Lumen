import type fr from '../fr/creationOperateur'
import type { Structure } from '../../types'

/** Allemand — espace « creationOperateur » (backlog § BK.2d), traduit depuis le français. */
const creationOperateur: Structure<typeof fr> = {
  creer: "Betreiberkonto erstellen",
  creeTitre: "Betreiberkonto „{nom}“ erstellt.",
  creeExplication: "Dieses Konto ist von deinem getrennt: Es gehört zu keinem Haushalt und sieht kein Vermögen. Um die Installation zu verwalten (Haushalte, geplante Aufgaben, Logo der SSO-Schaltfläche), melde dich ab und mit diesem Konto wieder an. Die Installationseinstellungen verschwinden jetzt aus deinen Einstellungen.",
}

export default creationOperateur
