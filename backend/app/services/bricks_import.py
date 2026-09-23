"""Parsing d'un export Bricks.co (crowdfunding/crowdlending immobilier) — retour
utilisateur du 13/09/2026, format distinct de Trade Republic et de Ledger, sa propre
carte d'import séparée sur l'écran Import.

Bricks.co : l'utilisateur achète des « briques » (fractions à prix fixe d'une
opération immobilière — obligation ou prêt), perçoit des revenus réguliers, puis le
capital est remboursé à l'échéance. Colonnes de l'export : `id, date (JJ/MM/AAAA),
type, statut, propriété, type de contrat, montant (€), prix de la brick (€)`.

Analyse du fichier réel fourni par l'utilisateur (1774 lignes) : 8 types de
mouvement, dont seuls 3 sont rattachés à un bien (`propriété` non vide) — les 5
autres (`Solde boosté`, `Prélèvement à la source`, `Ajustement commercial`, `Crédit
par carte`, `Crédit par virement`) sont des mouvements de PORTEFEUILLE DE COMPTE,
jamais un investissement, hors suivi d'investissement (même principe qu'`EXCLUDED_TYPES`
de `transaction_import.py` pour les virements bancaires Trade Republic).

**Convention de signe (vérifiée sur le fichier réel, aucune transformation
nécessaire)** : `montant` est déjà algébriquement cohérent avec
`portfolio_reconstruction._apply_transaction` (BUY : `amount` négatif ; SELL :
`amount` positif) — `Transaction.amount = montant` tel quel dans les deux cas. Seul
`shares` doit être dérivé : `shares = -montant / prix_brique` fonctionne pour les
DEUX cas (positif pour un achat, négatif pour un remboursement — les signes de
`montant` diffèrent déjà entre achat et remboursement).

**Limite assumée et documentée** : `Prélèvement à la source` (impôt retenu à la
source, mouvement de compte sans bien associé, jamais 1-pour-1 avec une ligne de
revenu précise) est exclu — les revenus importés (`Revenus reversés`) sont donc
BRUTS, pas nets de fiscalité.
"""

import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from .csv_import import to_float
from .lecture_tableau import lire_fichier

REQUIRED_COLUMNS_BRICKS = {
    "id",
    "date",
    "type",
    "statut",
    "propriété",
    "type de contrat",
    "montant (€)",
    "prix de la brick (€)",
}

STATUT_VALIDE = "Validée"

# Préfixe des symboles synthétiques générés ci-dessous (cf. `symbol_pour_bien`) —
# exposé comme constante nommée (plutôt que la chaîne littérale dupliquée) pour
# `analysis_service.value_holdings`, qui s'en sert pour reconnaître une ligne
# Bricks.co sans dépendre de `market_data_service.PREFIXES_SYMBOLES_INTERNES`
# (généraliste, pourrait un jour porter un préfixe non-européen) — cf. § AO.1.
PREFIXE_SYMBOLE = "BRICKS-"


def looks_like_bricks_export(columns: list[str]) -> bool:
    return REQUIRED_COLUMNS_BRICKS.issubset(set(columns))


def symbol_pour_bien(propriete: str) -> str:
    """Symbole déterministe et stable entre deux imports (même bien = même symbole,
    condition du ré-import et de la reconstruction du portefeuille) — court, sans
    collision réaliste sur le nombre de biens d'un utilisateur. Le nom lisible du
    bien est porté séparément par `Transaction.name`, affiché dans la colonne Nom
    du portefeuille."""
    empreinte = hashlib.md5(propriete.strip().lower().encode("utf-8")).hexdigest()[:10].upper()
    return f"{PREFIXE_SYMBOLE}{empreinte}"


def _clean(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if text == "" or text.lower() == "nan":
        return None
    return text


@dataclass
class ParsedBricksOperations:
    rows: list[dict] = field(default_factory=list)
    lignes_lues: int = 0
    lignes_ignorees_statut: int = 0
    lignes_ignorees_type_operation: dict[str, int] = field(default_factory=dict)
    # Remboursement d'un bien dont aucun achat validé n'est connu dans CE fichier
    # (export partiel qui ne couvrirait pas l'achat d'origine) — jamais rencontré
    # sur le fichier réel de l'utilisateur, mais ne doit jamais lever d'exception.
    lignes_ignorees_remboursement_sans_achat: int = 0
    nb_biens: int = 0
    montant_total_investi: float = 0.0


def parse_bricks_file(filename: str, content: bytes) -> ParsedBricksOperations:
    # Bricks.co exporte en `.xlsx`, mais rien n'empêche un futur export CSV du même
    # format : l'aiguillage commun accepte les deux.
    tableau = lire_fichier(filename, content)

    if not looks_like_bricks_export(tableau.colonnes):
        raise ValueError("Ce fichier ne ressemble pas à un export Bricks.co reconnu")

    result = ParsedBricksOperations(lignes_lues=len(tableau.lignes))

    lignes = []
    for row in tableau.lignes:
        date_brute = _clean(row.get("date"))
        try:
            dt = datetime.strptime(date_brute, "%d/%m/%Y") if date_brute else None
        except ValueError:
            dt = None
        if dt is None:
            continue
        lignes.append((dt, row))

    # Le fichier est fourni du plus récent au plus ancien — trié ici du plus ancien
    # au plus récent pour pouvoir reporter le prix de la brique d'un achat vers les
    # remboursements ultérieurs du même bien (`dernier_prix_brique` ci-dessous).
    lignes.sort(key=lambda item: item[0])

    biens_investis: set[str] = set()
    dernier_prix_brique: dict[str, float] = {}

    for dt, row in lignes:
        if _clean(row.get("statut")) != STATUT_VALIDE:
            result.lignes_ignorees_statut += 1
            continue

        type_ = _clean(row.get("type")) or ""
        propriete = _clean(row.get("propriété"))
        montant = to_float(row.get("montant (€)"))
        identifiant = _clean(row.get("id"))
        if montant is None or not identifiant:
            continue

        base = {
            "transaction_id": f"bricks:{identifiant}",
            "datetime_utc": dt,
            "date": dt.date().isoformat(),
            "name": propriete,
            "description": None,
        }

        if type_ == "Achat de bricks" and propriete:
            prix_brique = to_float(row.get("prix de la brick (€)"))
            if not prix_brique:
                continue
            symbol = symbol_pour_bien(propriete)
            dernier_prix_brique[propriete] = prix_brique
            biens_investis.add(propriete)
            result.montant_total_investi += abs(montant)
            result.rows.append(
                {
                    **base,
                    "category": "TRADING",
                    "type": "BUY",
                    "asset_class": "BOND",
                    "symbol": symbol,
                    "shares": -montant / prix_brique,
                    "price": prix_brique,
                    "amount": montant,
                    "fee": 0.0,
                    "tax": 0.0,
                }
            )
        elif type_ == "Remboursement de capital" and propriete:
            prix_brique = dernier_prix_brique.get(propriete)
            if not prix_brique:
                result.lignes_ignorees_remboursement_sans_achat += 1
                continue
            result.rows.append(
                {
                    **base,
                    "category": "TRADING",
                    "type": "SELL",
                    "asset_class": "BOND",
                    "symbol": symbol_pour_bien(propriete),
                    "shares": -montant / prix_brique,
                    "price": prix_brique,
                    "amount": montant,
                    "fee": 0.0,
                    "tax": 0.0,
                }
            )
        elif type_ == "Revenus reversés" and propriete:
            result.rows.append(
                {
                    **base,
                    "category": "CASH",
                    "type": "DIVIDEND",
                    "asset_class": "BOND",
                    "symbol": symbol_pour_bien(propriete),
                    "shares": None,
                    "price": None,
                    "amount": montant,
                    "fee": 0.0,
                    "tax": 0.0,
                }
            )
        else:
            result.lignes_ignorees_type_operation[type_] = result.lignes_ignorees_type_operation.get(type_, 0) + 1

    result.nb_biens = len(biens_investis)
    return result


# Staging entre l'aperçu et la confirmation — même patron que
# `ledger_import._PENDING_LEDGER`, dict séparé (types distincts, formats d'import
# indépendants).
_PENDING_BRICKS: dict[str, tuple[ParsedBricksOperations, datetime]] = {}
_MAX_PENDING_BRICKS = 20
DUREE_EXPIRATION_PENDING_BRICKS = timedelta(minutes=30)


def _purger_imports_expires() -> None:
    maintenant = datetime.now(UTC)
    expires = [token for token, (_, depose_le) in _PENDING_BRICKS.items() if maintenant - depose_le > DUREE_EXPIRATION_PENDING_BRICKS]
    for token in expires:
        _PENDING_BRICKS.pop(token, None)


def stage_parsed_bricks(parsed: ParsedBricksOperations) -> str:
    _purger_imports_expires()
    token = uuid.uuid4().hex
    if len(_PENDING_BRICKS) >= _MAX_PENDING_BRICKS:
        _PENDING_BRICKS.pop(next(iter(_PENDING_BRICKS)))
    _PENDING_BRICKS[token] = (parsed, datetime.now(UTC))
    return token


def get_pending_bricks(token: str) -> ParsedBricksOperations:
    _purger_imports_expires()
    entree = _PENDING_BRICKS.get(token)
    if entree is None:
        raise KeyError("Fichier introuvable ou expiré, merci de ré-uploader")
    return entree[0]


def clear_pending_bricks(token: str) -> None:
    _PENDING_BRICKS.pop(token, None)
