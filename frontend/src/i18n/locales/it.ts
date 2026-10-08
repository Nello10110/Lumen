import type { Dictionnaire } from '../index'
import espaces from './it/index'

/** Italien (backlog § BL) — traduit depuis `fr.ts`, à faire relire par un natif.
 * Même registre que le français : « Lei » là où il vouvoie, « tu » là où il tutoie. */
const it: Dictionnaire = {
  ...espaces,
  langue: {
    titre: 'Lingua',
    choixAria: "Lingua dell'interfaccia",
    reglagesDescription:
      "Lingua dell'app per tutto il nucleo familiare: ogni membro la vede in questa lingua, con numeri e date nel formato corrispondente.",
    etapeTexte: "In quale lingua vuoi usare l'app? Potrai cambiarla in qualsiasi momento in Impostazioni → Generale.",
  },
  nav: {
    synthese: 'Riepilogo',
    actifs: 'Attività',
    detailPosition: 'Dettaglio della posizione',
    comptes: 'Conti',
    detailCompte: 'Dettaglio del conto',
    analyse: 'Analisi',
    budget: 'Budget',
    rapport: 'Report',
    salaire: 'Stipendio',
    import: 'Importa',
    reglages: 'Impostazioni',
    aide: 'Aiuto',
    principale: 'Navigazione principale',
    principaleMobile: 'Navigazione principale (mobile)',
    plus: 'Altro',
    menuCompte: "Menu dell'account",
    deconnexion: 'Esci',
  },
  controles: {
    vue: 'Vista',
    net: 'Netto',
    brut: 'Lordo',
    financier: 'Finanziario',
    aideNet: 'Patrimonio netto: tutto ciò che possiede, MENO ciò che deve (prestiti in corso). È il Suo valore netto reale.',
    aideBrut: 'Patrimonio lordo: tutto ciò che possiede, SENZA dedurre i prestiti. Un immobile acquistato a credito conta per il suo valore intero.',
    aideFinancier: 'Solo il portafoglio finanziario: azioni, ETF, cripto, obbligazioni. Esclude immobili, risparmi e veicoli.',
    aideNetCourte: 'Tutto ciò che possiede, MENO ciò che deve (prestiti in corso).',
    aideBrutCourte: 'Tutto ciò che possiede, senza dedurre i prestiti.',
    aideFinancierCourte: 'Solo il portafoglio finanziario: azioni, ETF, cripto, obbligazioni.',
    vueNette: 'vista netta',
    vueBrute: 'vista lorda',
    vueFinanciere: 'vista finanziaria',
    detenteur: 'Membro',
    foyer: 'Intero nucleo',
    aideDetenteur:
      "Filtra l'intera schermata sulla quota di un solo membro del nucleo familiare, secondo le ripartizioni (quote) che ha inserito. «Intero nucleo» = tutto il patrimonio, senza filtro.",
    afficherMontants: 'Mostra gli importi',
    masquerMontants: 'Nascondi gli importi',
    raccourciMontants: '(Ctrl/⌘ + Maiusc + M).',
    aideMontantsMasques:
      'Sostituisce tutti gli importi con dei punti: comodo per una dimostrazione, uno screenshot o una consultazione in pubblico. Le percentuali restano visibili.',
    montantsMasques: 'Nascosti',
    montantsVisibles: 'Visibili',
    theme: 'Tema',
    themeClair: 'Tema chiaro',
    themeSombre: 'Eclipse (tema scuro)',
    themeSysteme: 'Segui il sistema',
    themeCourtClair: 'Chiaro',
    themeCourtSombre: 'Eclipse',
    themeCourtSysteme: 'Sistema',
    themeActuel: 'Tema: {theme}',
    themeActuelAide: 'Tema: {theme} (clic per cambiare)',
    themeActuelAria: 'Tema: {theme}. Clic per cambiare.',
    reglagesAffichage: 'Impostazioni di visualizzazione',
  },
  connexion: {
    bonRetour: 'Bentornato',
    creerUnCompte: 'Crea un account',
    accroche: 'Faccia luce sulle Sue finanze.',
    nomUtilisateur: 'Nome utente',
    motDePasse: 'Password',
    huitCaracteres: 'Minimo 8 caratteri',
    unInstant: 'Un momento...',
    seConnecter: 'Accedi',
    creerMonCompte: 'Crea il mio account',
    ou: 'oppure',
    seConnecterAvec: 'Accedi con {fournisseur}',
    serveurRedemarre: "Il server si sta riavviando, riconnessione in corso…",
    serveurSilencieux:
      "Il server non risponde al momento. Verifichi la connessione e riprovi.",
    portailExpire: "La sessione è scaduta. Riconnettersi per continuare.",
    reessayer: 'Riprova',
    seReconnecter: 'Riconnettiti',
    problemePersiste: "Il problema persiste?",
    reinitialiserExplication:
      "Questa azione cancella i dati salvati dall’app su questo dispositivo, poi la ricarica. I suoi conti e i suoi dati non vengono toccati.",
    reinitialiserApplication: "Reimposta l’app",
    pasEncoreDeCompte: 'Non ha ancora un account?',
    dejaUnCompte: 'Ha già un account?',
  },
  assistant: {
    titre: 'Configurazione iniziale',
    etapeSur: 'Passo {n} di {total}',
    precedent: 'Indietro',
    passer: "Salta l'assistente",
    terminer: 'Fine',
    suivant: 'Avanti',
    etapes: {
      bienvenue: 'Benvenuto',
      preferences: 'Preferenze',
      detenteurs: 'Composizione del nucleo',
      comptes: 'Conti',
      inviter: "Invita i tuoi cari",
      operateur: "Amministrazione dell'installazione",
      demarrage: 'Avvia il portafoglio',
      termine: 'Fatto',
    },
    bienvenue: {
      rejeu:
        'Ritorno alla configurazione iniziale: ogni passo successivo mostra ciò che è già salvato (preferenze, membri del nucleo, portafoglio). Nulla riparte da zero, puoi completare o correggere ciò che manca.',
      accroche: 'Benvenuto: facciamo luce sulle tue finanze, insieme.',
      presentation:
        "Quest'app segue il tuo patrimonio nel suo insieme: portafoglio titoli, immobili, risparmi, budget. Poche impostazioni iniziali la adattano alla tua situazione: bastano due minuti.",
      modifiable:
        'Ogni passo può essere saltato e modificato più tardi da Impostazioni, compreso questo assistente (pulsante "Rivedi l\'assistente di benvenuto" nella scheda Generale).',
    },
    preferences:
      'Come calcolare il prezzo di carico delle tue posizioni in borsa in caso di vendita parziale? La scelta predefinita va bene nella grande maggioranza dei casi.',
    detenteurs:
      "Se il patrimonio è condiviso (partner, figlio...), indica qui i membri del nucleo interessati: sarà utile per ripartire la proprietà delle attività più tardi. Non pertinente? Questo passo si salta senza inserire nulla.",
    comptes: {
      avantEcran:
        "Se il patrimonio è distribuito tra più banche o broker (conto corrente, PEA, conto titoli, assicurazione vita, immobili...), indicali qui per raggruppare tutto per istituto nella schermata",
      ecran: 'Conti',
      apresEcran:
        "e definire in una volta sola una ripartizione tra membri del nucleo per un intero conto. Non pertinente, o non ancora pronto? Questo passo si salta: in ogni caso un conto si crea al volo dal modulo di aggiunta di una posizione (verrà chiesto anche l'istituto, poiché un conto non può più esserne privo).",
      comptesCrees: 'Conti creati',
      aucunCompte: 'Nessun conto indicato.',
      sansEtablissement: 'Senza istituto',
      supprimer: 'Elimina',
    },
    inviter:
      "I tuoi cari (coniuge, figli, un familiare in sola consultazione…) possono avere un proprio accesso, con un proprio account: invitali con un link che invii tu stesso. Questo passo è facoltativo; potrai invitare quando vuoi da Impostazioni → Account e sicurezza.",
    operateur:
      "Questa installazione può accogliere più nuclei. Per amministrarli — crearne altri, sospenderne uno, regolare le attività pianificate — crea un account operatore: un account distinto dal tuo, che non appartiene a nessun nucleo e non vede nessun patrimonio. Per usarlo, accederai con questo account invece che con il tuo.",
    operateurPlusTard:
      "Questo passo è facoltativo. Potrai creare l'operatore più tardi da Impostazioni (finché sei solo sull'installazione), oppure da riga di comando.",
    demarrage: {
      dejaAvant: 'Il portafoglio contiene già',
      positions: { one: '{n} posizione', other: '{n} posizioni' },
      dejaApres: ". Aggiungine altre a mano o importa uno storico completo:",
      premiere: 'Aggiungi una prima posizione a mano o importa direttamente uno storico completo delle operazioni:',
      ou: 'oppure',
    },
    termine: {
      rejeu: 'Configurazione aggiornata.',
      pret: "È tutto pronto. L'app è configurata e pronta ad accogliere i tuoi dati.",
      accessible: 'Questo assistente resta accessibile in qualsiasi momento da Impostazioni → Generale.',
    },
  },
  recherche: {
    titre: 'Ricerca (Ctrl/⌘ + K)',
    aria: 'Ricerca',
    bouton: 'Cerca…',
    placeholder: 'Una schermata, una posizione, un prestito…',
    aucunResultat: 'Nessun risultato.',
    ecrans: 'Schermate',
    positions: 'Posizioni',
    emprunts: 'Prestiti',
  },
  format: {
    jamaisExecute: 'Mai eseguito',
  },
}

export default it
