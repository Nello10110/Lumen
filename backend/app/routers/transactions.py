"""Import du grand livre de transactions (format Trade Republic) et reconstruction
du portefeuille qui en découle.

Import en deux temps depuis le redesign du 03/09/2026 (demande directe de
l'utilisateur : « il faut qu'à l'import il me demande et remplisse
l'établissement ») — même patron que l'import de relevé de positions
(`routers/portfolio.py::import_preview`/`import_confirm`) : `/import/apercu`
parse le fichier et compte les lignes par bucket de compte suggéré
(`transaction_import.cle_compte`), `/import` crée les comptes nécessaires sous
l'établissement choisi puis importe."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..decimales import Decimale, en_decimal
from ..models import (
    SOURCE_IMPORT_BRICKS,
    SOURCE_IMPORT_LEDGER,
    SOURCE_IMPORT_TRADE_REPUBLIC,
    Compte,
    Etablissement,
    Transaction,
    User,
)
from ..schemas import (
    BricksApercu,
    BricksImportConfirm,
    BricksImportResult,
    LedgerImportApercu,
    LedgerImportConfirm,
    LedgerImportResult,
    TransactionImportApercu,
    TransactionImportConfirm,
    TransactionImportResult,
)
from ..services import (
    auth_service,
    bricks_import,
    comptes_service,
    journal_import_service,
    ledger_import,
    portfolio_reconstruction,
    preferences_service,
    transaction_import,
    upload_limits,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

# Tous les champs mutables de `Transaction` (hors `id`/`user_id`/`transaction_id`/
# `created_at`) — comparés lors d'un ré-import pour décider si une ligne déjà connue
# doit être RE-SYNCHRONISÉE (retour utilisateur du 10/09/2026 : « ça ne s'additionne
# pas mais ça met à jour les données ») plutôt qu'ignorée en silence comme avant.
# Même liste de clés que `transaction_import.parse_transactions_file` produit par ligne.
# `compte_id` en fait partie depuis le 14/09/2026 : le compte d'origine d'une
# transaction est désormais un fait stampé à l'import (cf. plus bas), pas une
# annotation manuelle à protéger — un ré-import le re-synchronise comme les autres
# champs, sans doctrine « ne jamais écraser ».
_CHAMPS_TRANSACTION = (
    "datetime_utc",
    "date",
    "category",
    "type",
    "asset_class",
    "symbol",
    "name",
    "shares",
    "price",
    "amount",
    "fee",
    "tax",
    "description",
    "compte_id",
)


def _normalise_pour_comparaison(valeur, champ: str):
    """Neutralise l'écart de fuseau entre `datetime_utc` fraîchement analysé
    (conscient du fuseau, `datetime.fromisoformat` avec un offset explicite) et sa
    valeur relue depuis la base (naïve — SQLite ne conserve pas l'information de
    fuseau) : sans cette normalisation, ce champ semblerait TOUJOURS différent d'un
    ré-import à l'autre, même strictement identique, et chaque ré-import
    signalerait à tort une mise à jour au lieu d'un doublon ignoré.

    Même piège, même remède, pour les montants et quantités depuis § BI.1 : le
    parseur rend un flottant (`0.001`), la base une `Decimal` (`0.0010000000`), et un
    flottant n'est égal à une `Decimal` que s'il la représente EXACTEMENT en binaire
    — ce que `0.001` ne fait pas. Chaque ré-import d'un fichier identique comptait
    donc une « mise à jour » (constaté par `test_reimport_du_meme_fichier_ne_duplique_pas`).
    La valeur est ramenée à ce que la colonne stockerait : même échelle, même
    arrondi."""
    if isinstance(valeur, datetime) and valeur.tzinfo is not None:
        return valeur.astimezone(UTC).replace(tzinfo=None)
    type_colonne = Transaction.__table__.columns[champ].type
    if isinstance(type_colonne, Decimale):
        return en_decimal(valeur, type_colonne.echelle)
    return valeur


def _upsert_transactions(db: Session, user_id: int, rows: list[dict]) -> tuple[int, int, int]:
    """Ré-synchronisation par `transaction_id` — factorisé pour l'import Trade
    Republic ET l'import Ledger (retour utilisateur du 10/09/2026 : « que ça ne
    s'additionne pas mais mette à jour », généralisable aux deux formats plutôt que
    dupliqué). Renvoie `(importees, mises_a_jour, doublons_ignores)`. Scopé à
    `user_id` : un `transaction_id` n'est garanti unique que par utilisateur
    (`UniqueConstraint`), jamais globalement."""
    existantes_par_id = {t.transaction_id: t for t in db.query(Transaction).filter(Transaction.user_id == user_id).all()}

    doublons = 0
    importees = 0
    mises_a_jour = 0
    for row in rows:
        existante = existantes_par_id.get(row["transaction_id"])
        if existante is None:
            nouvelle = Transaction(**row, user_id=user_id)
            db.add(nouvelle)
            existantes_par_id[row["transaction_id"]] = nouvelle
            importees += 1
            continue

        champs_modifies = [
            champ for champ in _CHAMPS_TRANSACTION
            if _normalise_pour_comparaison(getattr(existante, champ), champ) != _normalise_pour_comparaison(row[champ], champ)
        ]
        if not champs_modifies:
            doublons += 1
            continue
        for champ in champs_modifies:
            setattr(existante, champ, row[champ])
        mises_a_jour += 1

    return importees, mises_a_jour, doublons


@router.post("/import/apercu", response_model=TransactionImportApercu)
async def import_apercu(file: UploadFile, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    content = await file.read()
    try:
        upload_limits.verifier_taille_fichier(content)
    except upload_limits.FichierTropVolumineuxError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    try:
        parsed = transaction_import.parse_transactions_file(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    token = transaction_import.stage_parsed(parsed)
    comptages = {cle: n for cle, n in parsed.lignes_par_cle_compte.items() if n > 0}
    foyer = auth_service.id_foyer(current_user)
    langue = preferences_service.lire_langue_foyer(db, foyer)
    noms_existants = {nom for (nom,) in db.query(Compte.nom).filter(Compte.user_id == foyer).all()}
    noms_par_defaut = {cle: transaction_import.nom_compte_propose(cle, langue, noms_existants) for cle in comptages}
    etablissements = comptes_service.list_etablissements(db, foyer)

    return TransactionImportApercu(
        file_token=token,
        lignes_lues=parsed.lignes_lues,
        mouvements_hors_bourse_exclus=parsed.mouvements_hors_bourse_exclus,
        comptages=comptages,
        noms_par_defaut=noms_par_defaut,
        etablissements=etablissements,
    )


@router.post("/import", response_model=TransactionImportResult)
def import_transactions(payload: TransactionImportConfirm, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = auth_service.id_foyer(current_user)
    try:
        parsed = transaction_import.get_pending_transactions(payload.file_token)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if payload.etablissement_id is not None:
        etablissement = db.get(Etablissement, payload.etablissement_id)
        if etablissement is None or etablissement.user_id != user_id:
            raise HTTPException(status_code=404, detail="Établissement introuvable")
        etablissement_id = payload.etablissement_id
    else:
        etablissement_id = comptes_service.get_or_create_etablissement(
            db, user_id, payload.etablissement_nom, payload.etablissement_logo_key
        ).id

    # Un seul `Compte` créé par clé EFFECTIVEMENT présente dans le fichier (jamais les
    # 4 par défaut) — `get_or_create_compte_sans_commit` ne recrée jamais un compte
    # déjà existant sous ce nom (ré-import), et ne touche jamais son établissement
    # actuel si déjà créé par un import précédent.
    comptes_par_cle: dict[str, int] = {}
    comptes_crees = 0
    langue = preferences_service.lire_langue_foyer(db, user_id)
    noms_existants = {nom for (nom,) in db.query(Compte.nom).filter(Compte.user_id == user_id).all()}
    for cle, nb_lignes in parsed.lignes_par_cle_compte.items():
        if nb_lignes <= 0:
            continue
        nom = payload.noms_comptes.get(cle) or transaction_import.nom_compte_propose(cle, langue, noms_existants)
        existait_deja = db.query(Compte).filter(Compte.user_id == user_id, Compte.nom == nom).first() is not None
        compte = comptes_service.get_or_create_compte_sans_commit(db, user_id, nom, etablissement_id)
        comptes_par_cle[cle] = compte.id
        if not existait_deja:
            comptes_crees += 1

    # Compte réel stampé LIGNE PAR LIGNE (revu le 14/09/2026, retour utilisateur : un
    # même ticker mêlant deux buckets — ex. PEA et Crypto dans le même fichier —
    # fusionnait à tort en un seul compte). `cle_compte` est un champ transitoire de
    # `parsed.rows` (cf. `transaction_import.ParsedTransactions`), retiré ici avant
    # insertion — `Transaction` n'a pas de colonne de ce nom.
    for row in parsed.rows:
        row["compte_id"] = comptes_par_cle.get(row.pop("cle_compte"))

    # Re-synchronisation scopée à l'utilisateur (Milestone 2a) : le transaction_id
    # est émis par le courtier, pas garanti unique entre deux comptes courtier
    # différents — sans ce filtre, l'import de l'un pourrait toucher à tort une
    # transaction parce qu'un AUTRE utilisateur a, par coïncidence, le même
    # identifiant. Lignes complètes (pas seulement l'id) : l'export Trade Republic
    # est TOUJOURS l'historique complet, un ré-import doit donc RE-SYNCHRONISER une
    # ligne déjà connue si le courtier en a corrigé un champ dans l'intervalle
    # (montant, frais...), pas seulement la retrouver pour l'ignorer (retour
    # utilisateur du 10/09/2026 : « que ça ne s'additionne pas mais mette à jour »).
    importees, mises_a_jour, doublons = _upsert_transactions(db, user_id, parsed.rows)

    db.commit()
    transaction_import.clear_pending_transactions(payload.file_token)

    resultat_reconstruction = portfolio_reconstruction.rebuild_holdings(db, user_id)
    journal_import_service.enregistrer(db, user_id, SOURCE_IMPORT_TRADE_REPUBLIC, parsed.lignes_lues)

    return TransactionImportResult(
        lignes_lues=parsed.lignes_lues,
        importees=importees,
        mises_a_jour=mises_a_jour,
        doublons_ignores=doublons,
        mouvements_hors_bourse_exclus=parsed.mouvements_hors_bourse_exclus,
        positions_recalculees=resultat_reconstruction.positions_recalculees,
        anomalies_detectees=resultat_reconstruction.anomalies_detectees,
        lignes_manuelles_remplacees=resultat_reconstruction.lignes_manuelles_remplacees,
        comptes_crees=comptes_crees,
    )


@router.post("/import-ledger/apercu", response_model=LedgerImportApercu)
async def import_ledger_apercu(file: UploadFile, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retour utilisateur du 11/09/2026 : import d'un export de wallet matériel
    Ledger (crypto), format distinct de Trade Republic — même patron en deux temps
    (aperçu puis confirmation) que `import_apercu` ci-dessus, mais un décompte par
    devise plutôt que par bucket de compte : un wallet accumule souvent des jetons
    spam/poussière que l'utilisateur choisit de ne pas importer à l'étape suivante."""
    content = await file.read()
    try:
        upload_limits.verifier_taille_fichier(content)
    except upload_limits.FichierTropVolumineuxError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    try:
        parsed = ledger_import.parse_ledger_file(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    token = ledger_import.stage_parsed_ledger(parsed)
    etablissements = comptes_service.list_etablissements(db, auth_service.id_foyer(current_user))

    return LedgerImportApercu(
        file_token=token,
        lignes_lues=parsed.lignes_lues,
        lignes_ignorees_statut=parsed.lignes_ignorees_statut,
        lignes_ignorees_type_operation=parsed.lignes_ignorees_type_operation,
        devises=[
            {"ticker": d.ticker, "nb_operations": d.nb_operations, "montant_total_eur": d.montant_total_eur}
            for d in sorted(parsed.devises.values(), key=lambda d: d.montant_total_eur, reverse=True)
        ],
        etablissements=etablissements,
    )


@router.post("/import-ledger", response_model=LedgerImportResult)
def import_ledger(payload: LedgerImportConfirm, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = auth_service.id_foyer(current_user)
    try:
        parsed = ledger_import.get_pending_ledger(payload.file_token)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not payload.devises_selectionnees:
        raise HTTPException(status_code=400, detail="Choisissez au moins une devise à importer")

    if payload.etablissement_id is not None:
        etablissement = db.get(Etablissement, payload.etablissement_id)
        if etablissement is None or etablissement.user_id != user_id:
            raise HTTPException(status_code=404, detail="Établissement introuvable")
        etablissement_id = payload.etablissement_id
    else:
        etablissement_id = comptes_service.get_or_create_etablissement(
            db, user_id, payload.etablissement_nom, payload.etablissement_logo_key
        ).id

    devises_choisies = set(payload.devises_selectionnees)
    existait_deja = db.query(Compte).filter(Compte.user_id == user_id, Compte.nom == payload.nom_compte).first() is not None
    compte = comptes_service.get_or_create_compte_sans_commit(db, user_id, payload.nom_compte, etablissement_id)
    comptes_crees = 0 if existait_deja else 1

    # Tout l'import va vers un seul compte, déjà résolu ci-dessus — stampé sur
    # chaque ligne (revu le 14/09/2026, cf. `import_transactions` pour le cas
    # multi-bucket de Trade Republic).
    rows_filtrees = [row for row in parsed.rows if row["symbol"] in devises_choisies]
    for row in rows_filtrees:
        row["compte_id"] = compte.id
    importees, mises_a_jour, doublons = _upsert_transactions(db, user_id, rows_filtrees)

    db.commit()
    ledger_import.clear_pending_ledger(payload.file_token)

    resultat_reconstruction = portfolio_reconstruction.rebuild_holdings(db, user_id)

    lignes_ignorees = parsed.lignes_ignorees_statut + sum(parsed.lignes_ignorees_type_operation.values())
    journal_import_service.enregistrer(db, user_id, SOURCE_IMPORT_LEDGER, parsed.lignes_lues)

    return LedgerImportResult(
        lignes_lues=parsed.lignes_lues,
        importees=importees,
        mises_a_jour=mises_a_jour,
        doublons_ignores=doublons,
        lignes_ignorees=lignes_ignorees,
        positions_recalculees=resultat_reconstruction.positions_recalculees,
        anomalies_detectees=resultat_reconstruction.anomalies_detectees,
        comptes_crees=comptes_crees,
    )


@router.post("/import-bricks/apercu", response_model=BricksApercu)
async def import_bricks_apercu(file: UploadFile, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retour utilisateur du 13/09/2026 : import d'un export Bricks.co
    (crowdfunding/crowdlending immobilier), format distinct de Trade Republic et de
    Ledger — même patron en deux temps que les deux autres, mais un résumé (biens
    détectés, montant investi) plutôt qu'une sélection ligne à ligne : chaque
    opération Bricks.co est un investissement délibéré, pas un jeton spam reçu
    passivement."""
    content = await file.read()
    try:
        upload_limits.verifier_taille_fichier(content)
    except upload_limits.FichierTropVolumineuxError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    try:
        parsed = bricks_import.parse_bricks_file(file.filename or "export.xlsx", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    token = bricks_import.stage_parsed_bricks(parsed)
    etablissements = comptes_service.list_etablissements(db, auth_service.id_foyer(current_user))

    return BricksApercu(
        file_token=token,
        lignes_lues=parsed.lignes_lues,
        lignes_ignorees_statut=parsed.lignes_ignorees_statut,
        lignes_ignorees_type_operation=parsed.lignes_ignorees_type_operation,
        lignes_ignorees_remboursement_sans_achat=parsed.lignes_ignorees_remboursement_sans_achat,
        nb_biens=parsed.nb_biens,
        montant_total_investi=parsed.montant_total_investi,
        etablissements=etablissements,
    )


@router.post("/import-bricks", response_model=BricksImportResult)
def import_bricks(payload: BricksImportConfirm, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = auth_service.id_foyer(current_user)
    try:
        parsed = bricks_import.get_pending_bricks(payload.file_token)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if payload.etablissement_id is not None:
        etablissement = db.get(Etablissement, payload.etablissement_id)
        if etablissement is None or etablissement.user_id != user_id:
            raise HTTPException(status_code=404, detail="Établissement introuvable")
        etablissement_id = payload.etablissement_id
    else:
        etablissement_id = comptes_service.get_or_create_etablissement(
            db, user_id, payload.etablissement_nom, payload.etablissement_logo_key
        ).id

    existait_deja = db.query(Compte).filter(Compte.user_id == user_id, Compte.nom == payload.nom_compte).first() is not None
    compte = comptes_service.get_or_create_compte_sans_commit(db, user_id, payload.nom_compte, etablissement_id)
    comptes_crees = 0 if existait_deja else 1

    # Tout l'import Bricks.co va vers un seul compte — même traitement que Ledger.
    for row in parsed.rows:
        row["compte_id"] = compte.id
    importees, mises_a_jour, doublons = _upsert_transactions(db, user_id, parsed.rows)

    db.commit()
    bricks_import.clear_pending_bricks(payload.file_token)

    resultat_reconstruction = portfolio_reconstruction.rebuild_holdings(db, user_id)

    lignes_ignorees = (
        parsed.lignes_ignorees_statut
        + sum(parsed.lignes_ignorees_type_operation.values())
        + parsed.lignes_ignorees_remboursement_sans_achat
    )
    journal_import_service.enregistrer(db, user_id, SOURCE_IMPORT_BRICKS, parsed.lignes_lues)

    return BricksImportResult(
        lignes_lues=parsed.lignes_lues,
        importees=importees,
        mises_a_jour=mises_a_jour,
        doublons_ignores=doublons,
        lignes_ignorees=lignes_ignorees,
        positions_recalculees=resultat_reconstruction.positions_recalculees,
        anomalies_detectees=resultat_reconstruction.anomalies_detectees,
        comptes_crees=comptes_crees,
    )


@router.post("/reconstruct")
def reconstruct(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    resultat = portfolio_reconstruction.rebuild_holdings(db, auth_service.id_foyer(current_user))
    return {
        "positions_recalculees": resultat.positions_recalculees,
        "anomalies_detectees": resultat.anomalies_detectees,
        "lignes_manuelles_remplacees": resultat.lignes_manuelles_remplacees,
    }


@router.get("/count")
def count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Diagnostic (non utilisé par l'interface) : nombre de transactions en base,
    utile pour vérifier un import depuis les outils d'exploitation (cf. MANUEL_EXPLOITATION.md)."""
    return {"total": db.query(Transaction).filter(Transaction.user_id == auth_service.id_foyer(current_user)).count()}
