import type fr from '../fr/operateurPage'
import type { Structure } from '../../types'

/** Espagnol — espace « operateurPage » (backlog § BK.2d), traduit depuis le français. */
const operateurPage: Structure<typeof fr> = {
  titre: "Consola de la instalación",
  connecteEn: "Sesión iniciada como operador: {nom}.",
  deconnexion: "Cerrar sesión",
  avertissementSqliteTitre: "La separación de los hogares solo la garantiza la aplicación",
  avertissementSqlite: "Esta instalación usa {moteur}: la base de datos no impone la separación entre hogares, solo la garantiza el código de la aplicación. Es aceptable entre allegados en tu propio servidor; para acoger hogares que no se conocen, pasa a PostgreSQL.",
  sections: "Secciones de la consola",
  ongletFoyers: "Hogares",
  ongletInstallation: "Instalación",
  ongletTaches: "Tareas programadas",
  ongletJournal: "Registro de accesos",
  creerFoyerTitre: "Crear un hogar",
  creerFoyerIntro: "Genera un enlace «crea tu hogar» para enviárselo a la persona: allí crea su cuenta —o usa la que ya tiene— y el hogar, del que será propietaria. El hogar nace cuando acepta el enlace.",
}

export default operateurPage
