/** Textes français — espace « aidePage » (backlog § BL.2) : écran Aide & FAQ.
 * Les noms de zones et de secteurs viennent de l'espace « donnees » (libellés
 * communs aux graphiques) ; ici seulement les textes propres à l'aide. */
const aidePage = {
  titre: "Aide & FAQ",
  intro: "Un petit guide pour comprendre ce que racontent vraiment les chiffres du Tableau de bord — pensé pour un premier passage dans l’investissement, promis, sans jargon inutile.",
  zonesTitre: "🌍 Les 6 zones géographiques",
  zonesIntro: "Chaque position du portefeuille est rattachée à une zone selon le pays où se trouve réellement l’activité de l’entreprise (pas le pays où le fonds est domicilié administrativement). Voici les pays connus de chaque zone, directement depuis les règles utilisées par l’application.",
  autresZonesSansListe: "Pas de liste fixe : c’est la catégorie résiduelle pour un pays connu mais qui ne rentre dans aucune des 5 autres zones (ex. certains petits marchés d’Europe de l’Est ou d’Asie centrale). Elle grandira automatiquement si l’appli reconnaît un jour de nouveaux pays.",
  secteursTitre: "🏷️ Les 11 secteurs d'activité",
  secteursIntro: "En plus de la zone géographique, chaque position est aussi rattachée à un secteur — le TYPE d’activité de l’entreprise, indépendamment d’où elle se trouve.",
  exemples: "Ex. {exemples}",
  secteur: {
    technologies: "Logiciels, matériel informatique, semi-conducteurs : les entreprises qui construisent les outils numériques du quotidien.",
    financieres: "Banques, assurances, sociétés de gestion : le secteur qui fait circuler l’argent.",
    sante: "Pharmacie, biotechnologies, équipements médicaux et hospitaliers.",
    consommationDiscretionnaire: "Ce qu’on achète par envie plutôt que par nécessité : automobile, loisirs, hôtellerie, luxe, e-commerce.",
    industrie: "Machines, aéronautique, transport, construction, défense.",
    communication: "Télécoms, médias, réseaux sociaux, jeux vidéo, streaming.",
    consommationDeBase: "Ce qu’on achète par nécessité, quelle que soit la conjoncture : alimentation, hygiène, boissons.",
    energie: "Pétrole, gaz, énergies renouvelables, services pétroliers.",
    materiaux: "Matières premières transformées : chimie, mines, papier, emballage, acier.",
    servicesPublics: "Électricité, eau, gaz distribués aux particuliers et entreprises — secteur réglementé, généralement stable.",
    immobilier: "Foncières cotées, promoteurs, gestion de patrimoine immobilier.",
  },
  chiffresTitre: "🤔 Comprendre les chiffres de l'application",
  faq: {
    lookThrough: {
      question: "🔍 C’est quoi le \"look-through\" ?",
      reponse: "Un ETF \"Monde\" ne dit pas grand-chose en soi : c’est un panier de centaines d’actions. Le look-through consiste à regarder DANS le panier pour savoir ce qu’il contient vraiment (quels pays, quels secteurs), plutôt que de s’arrêter au nom du fonds. C’est ce qui permet à l’appli de vous dire \"35% Amérique du Nord\" même si vous ne détenez \"que\" quelques ETF.",
    },
    nonCategorise: {
      question: "❓ \"Non catégorisé\" vs \"Autres zones/secteurs\", quelle différence ?",
      reponse: "\"Non catégorisé\" veut dire qu’on n’a tout simplement pas la donnée (aucune composition connue pour ce titre). \"Autres zones\"/\"Autres secteurs\" veut dire qu’on SAIT où est la position, mais que ça ne rentre dans aucune des grandes catégories habituelles (ex. un pays comme le Zimbabwe, ou un secteur de niche). La nuance compte : la première mérite un rafraîchissement des données, la seconde est juste une catégorie résiduelle légitime.",
    },
    methodeCout: {
      question: "⚖️ Coût moyen pondéré vs FIFO, lequel choisir ?",
      reponse: "Ce sont deux façons de calculer le prix de revient quand on vend une partie d’une position achetée en plusieurs fois. Le coût moyen pondéré fait une moyenne de tous les achats. FIFO (\"premier entré, premier sorti\") considère qu’on revend d’abord les titres les plus anciens. Les deux sont corrects, mais donnent un gain/perte différent à la vente — certains cadres fiscaux imposent l’un ou l’autre. Réglable dans l’écran Réglages.",
    },
    xirr: {
      question: "📈 Le rendement annualisé (XIRR), ça veut dire quoi ?",
      reponse: "En une phrase : comme un taux d’intérêt qui tiendrait compte du moment exact où vous avez versé chaque euro, pas juste du début et de la fin. Plus précisément, c’est le taux de croissance annuel moyen qui, appliqué à chacun de vos versements (à leur date exacte), retomberait sur la valeur actuelle de votre portefeuille. Contrairement à une simple division gain/investi, il tient compte du MOMENT où l’argent a été investi — un euro investi il y a 3 ans ne \"pèse\" pas pareil qu’un euro investi hier.",
    },
    diversification: {
      question: "🎯 Le score de diversification, comment il est calculé ?",
      reponse: "Basé sur l’indice de Herfindahl-Hirschman (un classique en économie pour mesurer la concentration) : plus une seule ligne pèse lourd dans le portefeuille, plus le score baisse. 100/100 serait un portefeuille parfaitement réparti entre un très grand nombre de lignes égales ; un score qui chute signale qu’une poignée de positions domine tout.",
    },
    scorePatrimonial: {
      question: "🧭 Le score patrimonial, comment il est calculé ?",
      reponse: "Une moyenne pondérée de trois notes sur 100 : la diversification de vos actifs (40 %), la qualité des données de votre portefeuille financier (30 %, absente du calcul si vous n’avez pas de portefeuille financier — son poids est alors reporté sur les deux autres), et votre niveau d’endettement (30 %). Le détail des trois notes est toujours visible en dépliant la carte — jamais un chiffre sans sa méthode.",
    },
    estimation: {
      question: "🧩 Pourquoi la répartition géo d’un ETF est parfois \"estimée\" ?",
      reponse: "Certains fournisseurs de données ne donnent pas toujours le détail pays/secteur d’un fonds. Dans ce cas, l’appli déduit une estimation à partir de l’indice suivi (ex. un \"MSCI World\" suit une répartition mondiale connue et stable) plutôt que d’afficher \"Non catégorisé\". L’écran \"Qualité des données\" du Tableau de bord indique toujours si un chiffre est mesuré ou estimé.",
    },
  },
  sourcesTitre: "📡 D'où viennent les données ?",
  sourceYahoo: "fournit les cours des actions et une partie de la composition des fonds, rafraîchis automatiquement (cadence réglable dans Réglages).",
  sourceJustEtf: "fournit le cours de référence des ETF ainsi que leur composition géographique/sectorielle détaillée et leur description, sous une autorisation spécifique obtenue par l’utilisateur — traité avec beaucoup d’égards (rafraîchissement peu fréquent, pour ne pas solliciter leur service à l’excès).",
  sourceCoinGecko: "fournit le cours des cryptomonnaies (depuis le 15/09/2026, à la place de Yahoo Finance — plus fiable pour cette famille d’actifs). Nécessite une clé d’API gratuite (sans carte bancaire) configurée par l’exploitant ; sans elle, les lignes crypto affichent « Cotation indisponible ».",
  aucuneDonneeEnvoyee: "Aucune donnée n’est envoyée à l’extérieur : l’application tourne entièrement en local, sur votre machine. Elle va simplement chercher les cours dont elle a besoin, comme le ferait n’importe quel site financier.",
  glossaireTitre: "📖 Petit glossaire",
  glossaire: {
    etf: { terme: "ETF", definition: "Fonds coté en bourse qui réplique un indice (ex. le CAC 40 ou le S&P 500) — on l’achète et le vend comme une action, mais il contient plusieurs dizaines à plusieurs milliers de titres." },
    isin: { terme: "ISIN", definition: "Le \"numéro de sécurité sociale\" d’un titre financier : un code unique à 12 caractères qui l’identifie sans ambiguïté, quel que soit le courtier ou la place boursière." },
    peaCto: { terme: "PEA / CTO", definition: "Deux enveloppes pour détenir des titres en France. Le PEA (Plan d’Épargne en Actions) a un cadre fiscal avantageux mais des restrictions (titres européens surtout, plafond de versement). Le CTO (Compte-Titres Ordinaire) n’a pas ces limites, mais une fiscalité moins favorable." },
    ter: { terme: "TER", definition: "Comme les frais bancaires d’un abonnement : prélevés automatiquement, sans facture à régler à part. \"Total Expense Ratio\" : les frais de gestion annuels d’un fonds, en % de l’encours — ils réduisent simplement la performance du fonds chaque année." },
    drawdown: { terme: "Drawdown", definition: "La pire chute que le portefeuille ait encaissée avant de remonter — comme le point le plus bas d’un grand huit avant qu’il ne reparte vers le haut. Techniquement : la perte maximale subie entre un plus haut et le creux qui a suivi, sur une période donnée." },
    volatilite: { terme: "Volatilité", definition: "À quel point le trajet est mouvementé, pas s’il est bon ou mauvais — un peu comme la différence entre une route de montagne et une autoroute qui mènent au même endroit. Techniquement : à quel point le prix d’un titre bouge dans le temps, à la hausse comme à la baisse." },
    plusValue: { terme: "Plus-value latente / réalisée", definition: "Latente : le gain \"sur le papier\" d’une position toujours détenue, qui peut encore monter ou redescendre. Réalisée : le gain devenu définitif au moment de la vente." },
    quotite: { terme: "Quotité", definition: "La part du gâteau qui revient à chaque personne du foyer sur un bien ou un emprunt — comme des parts dans une indivision. En pourcentage, la somme des quotités d'une même ligne doit toujours faire 100 %." },
    capitalRestantDu: { terme: "Capital restant dû", definition: "Ce qu'il reste à rembourser sur un emprunt à un instant donné — comme le solde qui reste sur une carte de fidélité à points. Diminue à chaque mensualité payée, jusqu'à atteindre zéro à la fin du prêt." },
    rentabilite: { terme: "Rentabilité brute / nette", definition: "Brute : le loyer annuel rapporté au prix d'achat, sans rien retirer — comme un salaire \"brut\" avant charges. Nette : la même chose après avoir retiré charges, frais et taxes — l'équivalent d'un salaire \"net\"." },
    xirr: { terme: "XIRR (rendement annualisé)", definition: "Comme un taux d'intérêt qui tiendrait compte du moment exact où vous avez versé chaque euro, pas juste du début et de la fin. Voir la question détaillée ci-dessus pour l'explication complète." },
    lookThrough: { terme: "Look-through", definition: "Regarder DANS un fonds pour savoir ce qu'il contient vraiment (pays, secteurs), plutôt que de s'arrêter à son nom. Voir la question détaillée ci-dessus pour l'explication complète." },
  },
} as const

export default aidePage
