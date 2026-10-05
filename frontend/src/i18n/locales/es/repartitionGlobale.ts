import type fr from '../fr/repartitionGlobale'
import type { Structure } from '../../types'

/** Espagnol — espace « repartitionGlobale » (§ BN.1, lot 3), traduit depuis le français. */
const repartitionGlobale: Structure<typeof fr> = {
  badge: "Sin repartir",
  badgeAide: "Esta línea no tiene partes: cuenta para todo el hogar, pero ningún miembro la ve en su vista.",
  repartir: "Repartir",
  repartirAria: "Repartir «{nom}» entre los miembros del hogar",
  bandeau: {
    foyer: {
      one: "{n} línea aún no está repartida entre los miembros del hogar.",
      other: "{n} líneas aún no están repartidas entre los miembros del hogar.",
    },
    vueMembre: "Vista de {nom}: los valores son proporcionales a sus partes.",
    nonComptees: {
      one: "{n} línea sin repartir no se cuenta.",
      other: "{n} líneas sin repartir no se cuentan.",
    },
    toutAttribuer: "Asignar todo",
  },
  modale: {
    titre: "Asignar todo",
    introduction: "Aplica el mismo reparto a todas las líneas que aún no tienen uno. Las líneas ya repartidas no cambian, y no se modifica nada hasta que confirme.",
    apercuTitre: "Líneas afectadas",
    actifs: { one: "{n} activo", other: "{n} activos" },
    prets: { one: "{n} préstamo", other: "{n} préstamos" },
    et: "y",
    rienARepartir: "Todas las líneas ya están repartidas.",
    choix: "Reparto que se aplicará",
    appliquer: "Asignar",
    enCours: "Asignando…",
    annuler: "Cancelar",
    fermer: "Cerrar",
    termine: "Hecho: {lignes} ya tienen partes.",
  },
  prorata: "{pct} de {valeur}",
  repartirModale: {
    titre: "Repartir «{nom}»",
    introduction: "Define quién posee esta línea y con qué parte.",
    enregistrer: "Guardar el reparto",
    enregistree: "Reparto guardado.",
    fermer: "Cerrar",
  },
  quiLeDetient: {
    titre: "Quién lo posee",
    resumeParts: "{nom} {pct}",
    resumeAucune: "sin partes (la línea sigue siendo de todo el hogar)",
    aide: "Cada miembro del hogar posee una parte de esta línea; sin reparto, no aparece en la vista de ningún miembro.",
  },
  importQuestion: {
    titre: "¿A qué miembro pertenecen estas líneas?",
    aide: "Este reparto se aplica a las líneas que crea esta importación. Las que ya existen conservan sus partes.",
    dernierChoix: "Se retoma su última elección para este hogar.",
    invalide: "Complete el reparto (100 %) para importar.",
  },
  homonyme: {
    titre: "Ya existe una cuenta «{nom}»",
    detenuPar: "Pertenece a {membres}. El nombre de una cuenta es único dentro del hogar.",
    sansMembre: "El nombre de una cuenta es único dentro del hogar.",
    pourQui: "¿Para qué miembro?",
    ajouter: "Añadir a {nom} a esta cuenta",
    renommer: "Renombrar a «{nouveau}»",
    ajouteIntro: "{nom} se añade a esta cuenta: ajuste las partes y guarde.",
    separateur: "—",
  },
  avisFoyerEntier: {
    analyse: "Esta pantalla muestra todo el hogar: la vista de {nom} no se aplica aquí (la pestaña Evolución tiene su propia elección de miembro).",
    rapport: "Este informe abarca todo el hogar: la vista de {nom} no se aplica aquí.",
  },
  nonRepartiCompte: "Al menos una línea de esta cuenta no está repartida entre los miembros del hogar — haga clic para repartirla",
  membresDuCompte: "Miembros del hogar de esta cuenta: {membres}",
}

export default repartitionGlobale
