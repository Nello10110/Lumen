/** Textes français — espace « guidesExport » (backlog § BL.2) : tuiles et guides
 * d'export de l'écran Import. Un groupe par source, nommé comme `CleSourceImport`. */
const guidesExport = {
  trade_republic: {
    sousTitre: "Historique de transactions",
    intro: "Un grand livre de transactions complet (achats, ventes, dividendes), à partir duquel l'application reconstruit tout le portefeuille. À distinguer d'un simple relevé de positions.",
    etape1: "Récupère l'historique complet de ton compte au format CSV.",
    etape2: "Vérifie qu'il couvre TOUTE la période depuis l'ouverture du compte : la reconstruction repart de zéro à chaque import.",
    etape3: "Dépose le fichier sur cette tuile.",
    colonnes: "Le fichier doit porter les colonnes datetime, date, category, type, asset_class, symbol, shares, price, amount et fee. Le format est reconnu automatiquement — aucune association de colonnes à faire.",
  },
  ledger: {
    sousTitre: "Wallet crypto",
    intro: "Un export des opérations de ton wallet matériel. Chaque réception est traitée comme un achat au cours du jour de réception.",
    etape1: "Ouvre Ledger Live sur ton ordinateur.",
    etape2: "Demande l'export des opérations de tous tes comptes au format CSV.",
    etape3: "Dépose le fichier sur cette tuile, puis décoche les jetons indésirables (spam, poussière) avant de confirmer.",
    colonnes: "Le fichier doit porter les colonnes Operation Date, Status, Currency Ticker, Operation Type, Operation Amount et Countervalue at Operation Date.",
  },
  bricks: {
    sousTitre: "Crowdfunding immobilier",
    intro: "Un export de tes transactions : achats de briques, remboursements et revenus perçus. Les revenus alimentent le calendrier de dividendes.",
    etape1: "Connecte-toi à ton espace Bricks.co.",
    etape2: "Demande l'export de l'historique de tes transactions (CSV ou Excel).",
    etape3: "Dépose le fichier sur cette tuile.",
    colonnes: "Le fichier doit porter les colonnes id, date, type, statut, propriété, type de contrat, montant (€) et prix de la brick (€). Seules les lignes au statut « Validée » sont importées.",
  },
  releve: {
    nom: "Relevé de positions",
    sousTitre: "Tout autre courtier",
    intro: "Pour un courtier dont le format n'est pas reconnu automatiquement (Boursorama, Degiro, Interactive Brokers...). Tu associes toi-même les colonnes du fichier aux champs attendus.",
    etape1: "Exporte ton portefeuille depuis ton courtier au format CSV ou Excel.",
    etape2: "Dépose le fichier sur cette tuile.",
    etape3: "Associe au minimum une colonne Ticker et une colonne Quantité ; le prix de revient, le nom, le compte et la devise restent facultatifs.",
    colonnes: "Aucun nom de colonne imposé : le fichier est lu tel quel et l'association se fait à l'étape suivante. Le séparateur (virgule, point-virgule, tabulation) est détecté automatiquement.",
  },
  bancaire: {
    nom: "Mouvements bancaires",
    sousTitre: "Pour l'écran Budget",
    intro: "Le relevé de ton compte courant, qui alimente l'écran Budget — indépendant du portefeuille boursier.",
    etape1: "Depuis ton espace bancaire, exporte les mouvements du compte au format OFX, QIF ou CSV.",
    etape2: "Dépose le fichier sur cette tuile.",
    etape3: "Un OFX ou un QIF est importé directement. Un CSV demande d'associer au moins une colonne Date, une colonne Libellé et la ou les colonnes de montant.",
  },
} as const

export default guidesExport
