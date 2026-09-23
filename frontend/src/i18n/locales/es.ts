import type { Dictionnaire } from '../index'
import espaces from './es/index'

/** Espagnol (backlog § BL) — traduit depuis `fr.ts`, à faire relire par un natif.
 * Même registre que le français : « usted » là où il vouvoie, « tú » là où il tutoie. */
const es: Dictionnaire = {
  ...espaces,
  langue: {
    titre: 'Idioma',
    choixAria: 'Idioma de la interfaz',
    reglagesDescription:
      'Idioma de la aplicación para todo el hogar: cada miembro la ve en este idioma, con los números y las fechas en el formato correspondiente. La traducción de la aplicación está en curso: algunas pantallas siguen en francés por ahora.',
    etapeTexte: '¿En qué idioma quieres usar la aplicación? Podrás cambiarlo en cualquier momento en Ajustes → General.',
  },
  nav: {
    synthese: 'Resumen',
    actifs: 'Activos',
    detailPosition: 'Detalle de la posición',
    comptes: 'Cuentas',
    detailCompte: 'Detalle de la cuenta',
    analyse: 'Análisis',
    budget: 'Presupuesto',
    rapport: 'Informe',
    salaire: 'Salario',
    import: 'Importar',
    reglages: 'Ajustes',
    aide: 'Ayuda',
    principale: 'Navegación principal',
    principaleMobile: 'Navegación principal (móvil)',
    plus: 'Más',
    menuCompte: 'Menú de la cuenta',
    deconnexion: 'Cerrar sesión',
  },
  controles: {
    vue: 'Vista',
    net: 'Neto',
    brut: 'Bruto',
    financier: 'Financiero',
    aideNet: 'Patrimonio neto: todo lo que posee, MENOS lo que debe (préstamos en curso). Es su valor neto real.',
    aideBrut: 'Patrimonio bruto: todo lo que posee, SIN descontar los préstamos. Un bien comprado a crédito cuenta por su valor total.',
    aideFinancier: 'Solo la cartera financiera: acciones, ETF, cripto, bonos. Excluye inmuebles, ahorro y vehículos.',
    aideNetCourte: 'Todo lo que posee, MENOS lo que debe (préstamos en curso).',
    aideBrutCourte: 'Todo lo que posee, sin descontar los préstamos.',
    aideFinancierCourte: 'Solo la cartera financiera: acciones, ETF, cripto, bonos.',
    vueNette: 'vista neta',
    vueBrute: 'vista bruta',
    vueFinanciere: 'vista financiera',
    detenteur: 'Titular',
    foyer: 'Hogar',
    aideDetenteur:
      'Filtra toda la pantalla por la parte de una sola persona del hogar, según los repartos (cuotas) que haya introducido. «Hogar» = todo el patrimonio, sin filtro.',
    afficherMontants: 'Mostrar los importes',
    masquerMontants: 'Ocultar los importes',
    raccourciMontants: '(Ctrl/⌘ + Mayús + M).',
    aideMontantsMasques:
      'Sustituye todos los importes por puntos: práctico para una demostración, una captura de pantalla o una consulta en público. Los porcentajes siguen visibles.',
    montantsMasques: 'Ocultos',
    montantsVisibles: 'Visibles',
    theme: 'Tema',
    themeClair: 'Tema claro',
    themeSombre: 'Eclipse (tema oscuro)',
    themeSysteme: 'Seguir el sistema',
    themeCourtClair: 'Claro',
    themeCourtSombre: 'Eclipse',
    themeCourtSysteme: 'Sistema',
    themeActuel: 'Tema: {theme}',
    themeActuelAide: 'Tema: {theme} (pulse para cambiar)',
    themeActuelAria: 'Tema: {theme}. Pulse para cambiar.',
    reglagesAffichage: 'Ajustes de visualización',
  },
  connexion: {
    bonRetour: 'Bienvenido de nuevo',
    creerUnCompte: 'Crear una cuenta',
    accroche: 'Arroje luz sobre sus finanzas.',
    nomUtilisateur: 'Nombre de usuario',
    motDePasse: 'Contraseña',
    huitCaracteres: 'Mínimo 8 caracteres',
    unInstant: 'Un momento...',
    seConnecter: 'Iniciar sesión',
    creerMonCompte: 'Crear mi cuenta',
    ou: 'o',
    seConnecterAvec: 'Iniciar sesión con {fournisseur}',
    portailExpire:
      'La sesión con el portal de autenticación ha caducado: la aplicación se muestra desde la caché, pero ya no se comunica con el servidor. «Volver a conectarse» la recarga desde la red para que pueda volver a iniciar sesión.',
    serveurInjoignable:
      'No se puede contactar con el servidor: si este hogar usa un inicio de sesión SSO, su botón no puede mostrarse por ahora.',
    reessayer: 'Reintentar',
    seReconnecter: 'Volver a conectarse',
    viderCache: 'Vaciar la caché de la aplicación',
    pasEncoreDeCompte: '¿Aún no tiene cuenta?',
    dejaUnCompte: '¿Ya tiene una cuenta?',
  },
  assistant: {
    titre: 'Configuración inicial',
    etapeSur: 'Paso {n} de {total}',
    precedent: 'Anterior',
    passer: 'Omitir el asistente',
    terminer: 'Terminar',
    suivant: 'Siguiente',
    etapes: {
      bienvenue: 'Bienvenida',
      preferences: 'Preferencias',
      detenteurs: 'Titulares del hogar',
      comptes: 'Cuentas',
      demarrage: 'Empezar la cartera',
      termine: 'Listo',
    },
    bienvenue: {
      rejeu:
        'Vuelta a la configuración inicial: cada paso siguiente muestra lo que ya está guardado (preferencias, titulares, cartera). Nada se repite desde cero; puedes completar o corregir lo que falte.',
      accroche: 'Bienvenido: arrojemos luz sobre tus finanzas, juntos.',
      presentation:
        'Esta aplicación sigue tu patrimonio en su conjunto: cartera bursátil, inmuebles, ahorro, presupuesto. Unos pocos ajustes iniciales la adaptan a tu situación; son dos minutos.',
      modifiable:
        'Cada paso puede omitirse y modificarse más tarde desde Ajustes, incluido este asistente (botón "Volver a ver el asistente de bienvenida" en la pestaña General).',
    },
    preferences:
      '¿Cómo calcular el precio de coste de tus posiciones bursátiles en una venta parcial? La opción por defecto sirve para la gran mayoría de los casos.',
    detenteurs:
      'Si el patrimonio es compartido (pareja, hijo...), declara aquí a las personas implicadas: será útil para repartir la propiedad de los activos más adelante. ¿No aplica? Este paso puede omitirse sin introducir nada.',
    comptes: {
      avantEcran:
        'Si el patrimonio está repartido entre varios bancos o brókeres (cuenta corriente, PEA, cuenta de valores, seguro de vida, inmuebles...), decláralos aquí para agruparlo todo por entidad en la pantalla',
      ecran: 'Cuentas',
      apresEcran:
        'y definir un reparto entre titulares para una cuenta entera de una sola vez. ¿No aplica, o aún no estás listo? Este paso puede omitirse: de todos modos, una cuenta se crea al vuelo desde el formulario para añadir una posición (también se pedirá la entidad, ya que una cuenta ya no puede carecer de ella).',
      comptesCrees: 'Cuentas creadas',
      aucunCompte: 'Ninguna cuenta declarada.',
      sansEtablissement: 'Sin entidad',
      supprimer: 'Eliminar',
    },
    demarrage: {
      dejaAvant: 'La cartera ya tiene',
      positions: { one: '{n} posición', other: '{n} posiciones' },
      dejaApres: '. Añade otras a mano o importa un historial completo:',
      premiere: 'Añade una primera posición a mano o importa directamente un historial completo de operaciones:',
      ou: 'o',
    },
    termine: {
      rejeu: 'Configuración al día.',
      pret: 'Todo listo. La aplicación está configurada y preparada para recibir tus datos.',
      accessible: 'Este asistente sigue disponible en cualquier momento desde Ajustes → General.',
    },
  },
  recherche: {
    titre: 'Búsqueda (Ctrl/⌘ + K)',
    aria: 'Búsqueda',
    bouton: 'Buscar…',
    placeholder: 'Una pantalla, una posición, un préstamo…',
    aucunResultat: 'Ningún resultado.',
    ecrans: 'Pantallas',
    positions: 'Posiciones',
    emprunts: 'Préstamos',
  },
  format: {
    jamaisExecute: 'Nunca ejecutado',
  },
}

export default es
