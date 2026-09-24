import type { Dictionnaire } from '../index'
import espaces from './de/index'

/** Allemand (backlog § BL) — traduit depuis `fr.ts`, à faire relire par un natif.
 * Même registre que le français : « Sie » là où il vouvoie, « du » là où il tutoie. */
const de: Dictionnaire = {
  ...espaces,
  langue: {
    titre: 'Sprache',
    choixAria: 'Sprache der Oberfläche',
    reglagesDescription:
      'Sprache der App für den gesamten Haushalt: Jedes Mitglied sieht sie in dieser Sprache, Zahlen und Daten im passenden Format.',
    etapeTexte: 'In welcher Sprache möchtest du die App nutzen? Du kannst sie jederzeit unter Einstellungen → Allgemein ändern.',
  },
  nav: {
    synthese: 'Übersicht',
    actifs: 'Vermögenswerte',
    detailPosition: 'Details der Position',
    comptes: 'Konten',
    detailCompte: 'Details des Kontos',
    analyse: 'Analyse',
    budget: 'Budget',
    rapport: 'Bericht',
    salaire: 'Gehalt',
    import: 'Import',
    reglages: 'Einstellungen',
    aide: 'Hilfe',
    principale: 'Hauptnavigation',
    principaleMobile: 'Hauptnavigation (mobil)',
    plus: 'Mehr',
    menuCompte: 'Kontomenü',
    deconnexion: 'Abmelden',
  },
  controles: {
    vue: 'Ansicht',
    net: 'Netto',
    brut: 'Brutto',
    financier: 'Finanziell',
    aideNet: 'Nettovermögen: alles, was Sie besitzen, MINUS das, was Sie schulden (laufende Kredite). Das ist Ihr tatsächlicher Nettowert.',
    aideBrut: 'Bruttovermögen: alles, was Sie besitzen, OHNE Abzug der Kredite. Eine auf Kredit gekaufte Immobilie zählt mit ihrem vollen Wert.',
    aideFinancier: 'Nur das Finanzportfolio: Aktien, ETFs, Krypto, Anleihen. Ohne Immobilien, Ersparnisse und Fahrzeuge.',
    aideNetCourte: 'Alles, was Sie besitzen, MINUS das, was Sie schulden (laufende Kredite).',
    aideBrutCourte: 'Alles, was Sie besitzen, ohne Abzug der Kredite.',
    aideFinancierCourte: 'Nur das Finanzportfolio: Aktien, ETFs, Krypto, Anleihen.',
    vueNette: 'Nettoansicht',
    vueBrute: 'Bruttoansicht',
    vueFinanciere: 'Finanzansicht',
    detenteur: 'Inhaber',
    foyer: 'Haushalt',
    aideDetenteur:
      'Filtert den ganzen Bildschirm auf den Anteil einer einzelnen Person des Haushalts, gemäß den von Ihnen erfassten Aufteilungen (Anteile). „Haushalt“ = das gesamte Vermögen, ohne Filter.',
    afficherMontants: 'Beträge anzeigen',
    masquerMontants: 'Beträge ausblenden',
    raccourciMontants: '(Strg/⌘ + Umschalt + M).',
    aideMontantsMasques:
      'Ersetzt alle Beträge durch Punkte — praktisch für eine Vorführung, einen Screenshot oder die Nutzung in der Öffentlichkeit. Prozentsätze bleiben sichtbar.',
    montantsMasques: 'Ausgeblendet',
    montantsVisibles: 'Sichtbar',
    theme: 'Design',
    themeClair: 'Helles Design',
    themeSombre: 'Eclipse (dunkles Design)',
    themeSysteme: 'Wie das System',
    themeCourtClair: 'Hell',
    themeCourtSombre: 'Eclipse',
    themeCourtSysteme: 'System',
    themeActuel: 'Design: {theme}',
    themeActuelAide: 'Design: {theme} (zum Ändern klicken)',
    themeActuelAria: 'Design: {theme}. Zum Ändern klicken.',
    reglagesAffichage: 'Anzeigeeinstellungen',
  },
  connexion: {
    bonRetour: 'Willkommen zurück',
    creerUnCompte: 'Konto erstellen',
    accroche: 'Bringen Sie Licht in Ihre Finanzen.',
    nomUtilisateur: 'Benutzername',
    motDePasse: 'Passwort',
    huitCaracteres: 'Mindestens 8 Zeichen',
    unInstant: 'Einen Moment...',
    seConnecter: 'Anmelden',
    creerMonCompte: 'Mein Konto erstellen',
    ou: 'oder',
    seConnecterAvec: 'Mit {fournisseur} anmelden',
    portailExpire:
      'Die Sitzung mit dem Authentifizierungsportal ist abgelaufen: Die App wird aus dem Cache angezeigt, spricht aber nicht mehr mit dem Server. „Erneut verbinden“ lädt sie aus dem Netzwerk neu, damit Sie sich wieder anmelden können.',
    serveurInjoignable:
      'Der Server ist nicht erreichbar: Falls dieser Haushalt eine SSO-Anmeldung nutzt, kann ihre Schaltfläche derzeit nicht angezeigt werden.',
    reessayer: 'Erneut versuchen',
    seReconnecter: 'Erneut verbinden',
    viderCache: 'App-Cache leeren',
    pasEncoreDeCompte: 'Noch kein Konto?',
    dejaUnCompte: 'Bereits ein Konto?',
  },
  assistant: {
    titre: 'Ersteinrichtung',
    etapeSur: 'Schritt {n} von {total}',
    precedent: 'Zurück',
    passer: 'Assistent überspringen',
    terminer: 'Fertigstellen',
    suivant: 'Weiter',
    etapes: {
      bienvenue: 'Willkommen',
      preferences: 'Einstellungen',
      detenteurs: 'Personen im Haushalt',
      comptes: 'Konten',
      demarrage: 'Portfolio beginnen',
      termine: 'Fertig',
    },
    bienvenue: {
      rejeu:
        'Zurück zur Ersteinrichtung — jeder folgende Schritt zeigt, was bereits gespeichert ist (Einstellungen, Personen, Portfolio): Nichts beginnt von vorn, du kannst Fehlendes ergänzen oder korrigieren.',
      accroche: 'Willkommen — bringen wir gemeinsam Licht in deine Finanzen.',
      presentation:
        'Diese App verfolgt dein Vermögen als Ganzes: Wertpapierportfolio, Immobilien, Ersparnisse, Budget. Ein paar Starteinstellungen passen sie an deine Situation an — das dauert zwei Minuten.',
      modifiable:
        'Jeder Schritt kann übersprungen und später in den Einstellungen geändert werden, auch dieser Assistent selbst (Schaltfläche „Willkommensassistent erneut ansehen“ im Tab Allgemein).',
    },
    preferences:
      'Wie soll der Einstandspreis deiner Wertpapierpositionen bei einem Teilverkauf berechnet werden? Die Standardwahl passt für die große Mehrheit der Fälle.',
    detenteurs:
      'Wenn das Vermögen geteilt ist (Partner, Kind...), erfasse hier die betroffenen Personen — nützlich, um später das Eigentum an den Vermögenswerten aufzuteilen. Nicht zutreffend? Dieser Schritt lässt sich ohne Eingabe überspringen.',
    comptes: {
      avantEcran:
        'Wenn das Vermögen auf mehrere Banken oder Broker verteilt ist (Girokonto, PEA, Depot, Lebensversicherung, Immobilien...), erfasse sie hier, um alles nach Institut auf dem Bildschirm',
      ecran: 'Konten',
      apresEcran:
        'zu gruppieren und eine Aufteilung zwischen Personen für ein ganzes Konto auf einmal festzulegen. Nicht zutreffend oder noch nicht bereit? Dieser Schritt lässt sich überspringen — ein Konto wird ohnehin beim Hinzufügen einer Position direkt angelegt (dann wird auch das Institut abgefragt, da ein Konto nicht mehr ohne sein kann).',
      comptesCrees: 'Angelegte Konten',
      aucunCompte: 'Kein Konto erfasst.',
      sansEtablissement: 'Ohne Institut',
      supprimer: 'Löschen',
    },
    demarrage: {
      dejaAvant: 'Das Portfolio enthält bereits',
      positions: { one: '{n} Position', other: '{n} Positionen' },
      dejaApres: '. Füge weitere von Hand hinzu oder importiere eine vollständige Historie:',
      premiere: 'Füge eine erste Position von Hand hinzu oder importiere direkt eine vollständige Transaktionshistorie:',
      ou: 'oder',
    },
    termine: {
      rejeu: 'Einrichtung aktuell.',
      pret: 'Alles bereit. Die App ist eingerichtet und bereit für deine Daten.',
      accessible: 'Dieser Assistent bleibt jederzeit unter Einstellungen → Allgemein erreichbar.',
    },
  },
  recherche: {
    titre: 'Suche (Strg/⌘ + K)',
    aria: 'Suche',
    bouton: 'Suchen…',
    placeholder: 'Ein Bildschirm, eine Position, ein Kredit…',
    aucunResultat: 'Keine Ergebnisse.',
    ecrans: 'Bildschirme',
    positions: 'Positionen',
    emprunts: 'Kredite',
  },
  format: {
    jamaisExecute: 'Nie ausgeführt',
  },
}

export default de
