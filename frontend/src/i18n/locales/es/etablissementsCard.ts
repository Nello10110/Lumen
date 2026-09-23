import type fr from '../fr/etablissementsCard'
import type { Structure } from '../../types'

/** Espagnol — espace « etablissementsCard » (backlog § BL.2), traduit depuis le français. */
const etablissementsCard: Structure<typeof fr> = {
  banquesEtCourtiersDeclaresUne: "Bancos y brókeres, declarados una vez y reutilizados para agrupar tus cuentas en la pantalla",
  comptes: "Cuentas",
  exCaisseDEpargneContenant: "(p. ej. «Caisse d’Épargne» con una cuenta corriente y un seguro de vida). Eliminar una entidad nunca afecta a las cuentas vinculadas: simplemente pasan a «Sin entidad».",
  aucunEtablissementDeclare: "Ninguna entidad declarada.",
  modifier: "Modificar",
  supprimer: "Eliminar",
  nom: "Nombre",
  caisseDEpargne: "Caisse d'Épargne",
  ajouter: "Añadir",
  etablissements: "Entidades",
}

export default etablissementsCard
