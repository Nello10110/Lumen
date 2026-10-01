"""Budget (backlog 2.N.1/2.N.2) : import de mouvements bancaires (CSV mappé, OFX,
QIF), catégories et règles de catégorisation, écran Budget (indicateurs, répartition,
budget cible). Routeur enregistré `_pas_invite` dans `main.py` : le budget ne fait
pas partie des trois écrans ouverts à l'invité (backlog 2.L.2)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..i18n import tr
from ..models import SOURCE_IMPORT_BANCAIRE, Compte, Etablissement, User
from ..schemas import (
    ApercuFusionOut,
    BudgetCibleOut,
    BudgetCibleUpdate,
    BudgetColumnMapping,
    BudgetImportPreviewResponse,
    BudgetImportResult,
    BudgetSummary,
    CategorieBudgetCreate,
    CategorieBudgetOut,
    CategorieBudgetUpdate,
    CompteImportBancaire,
    CompteOut,
    FormatBancaireOut,
    FusionCategorieRequest,
    JonctionPatrimoine,
    MouvementBancaireOut,
    MouvementCategorisationUpdate,
    RecurrencesOut,
    RegleCategorisationCreate,
    RegleCategorisationOut,
    RegleReapplicationResult,
)
from ..services import (
    auth_service,
    budget_categories_service,
    budget_formats_service,
    budget_import_service,
    budget_recurrences_service,
    budget_service,
    comptes_service,
    csv_import,
    journal_import_service,
    upload_limits,
)

router = APIRouter(prefix="/api/budget", tags=["budget"])


# ---------------------------------------------------------------------------
# Catégories
# ---------------------------------------------------------------------------


@router.get("/categories", response_model=list[CategorieBudgetOut])
def list_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return budget_categories_service.list_categories(db, auth_service.id_foyer(current_user))


@router.post("/categories", response_model=CategorieBudgetOut)
def create_categorie(payload: CategorieBudgetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return budget_categories_service.create_categorie(db, auth_service.id_foyer(current_user), payload.nom, payload.parent_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/categories/{categorie_id}", response_model=CategorieBudgetOut)
def modifier_categorie(
    categorie_id: int, payload: CategorieBudgetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    try:
        return budget_categories_service.modifier_categorie(
            db,
            auth_service.id_foyer(current_user),
            categorie_id,
            nom=payload.nom,
            exclue_des_totaux=payload.exclue_des_totaux,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/categories/{categorie_id}/fusion", response_model=ApercuFusionOut)
def apercu_fusion(categorie_id: int, cible_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return budget_categories_service.apercu_fusion(db, auth_service.id_foyer(current_user), categorie_id, cible_id)
    except budget_categories_service.FusionImpossibleError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/categories/{categorie_id}/fusion", response_model=ApercuFusionOut)
def fusionner_categorie(
    categorie_id: int, payload: FusionCategorieRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    try:
        return budget_categories_service.fusionner_categories(db, auth_service.id_foyer(current_user), categorie_id, payload.cible_id)
    except budget_categories_service.FusionImpossibleError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/categories/{categorie_id}", status_code=204)
def delete_categorie(categorie_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        budget_categories_service.delete_categorie(db, auth_service.id_foyer(current_user), categorie_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Règles de catégorisation
# ---------------------------------------------------------------------------


@router.get("/regles", response_model=list[RegleCategorisationOut])
def list_regles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return budget_categories_service.list_regles(db, auth_service.id_foyer(current_user))


@router.post("/regles", response_model=RegleCategorisationOut)
def create_regle(payload: RegleCategorisationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return budget_categories_service.create_regle(db, auth_service.id_foyer(current_user), payload.motif, payload.categorie_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/regles/{regle_id}", status_code=204)
def delete_regle(regle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        budget_categories_service.delete_regle(db, auth_service.id_foyer(current_user), regle_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/regles/reappliquer", response_model=RegleReapplicationResult)
def reappliquer_regles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    modifies = budget_import_service.reappliquer_regles(db, auth_service.id_foyer(current_user))
    return RegleReapplicationResult(mouvements_modifies=modifies)


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------


@router.post("/import/csv/preview", response_model=BudgetImportPreviewResponse)
async def import_csv_preview(file: UploadFile):
    content = await file.read()
    try:
        upload_limits.verifier_taille_fichier(content)
    except upload_limits.FichierTropVolumineuxError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    try:
        parsed = csv_import.parse_upload(file.filename or "upload", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    format_ = budget_formats_service.detecter_format(parsed.columns)
    return BudgetImportPreviewResponse(
        file_token=parsed.token,
        columns=parsed.columns,
        rows=parsed.preview_rows,
        total_rows=parsed.total_rows,
        format_detecte=FormatBancaireOut(code=format_.code, nom=format_.nom) if format_ else None,
        mapping_suggere=budget_formats_service.mapping_suggere(format_, parsed.columns) if format_ else {},
    )


@router.post("/import/csv/confirm", response_model=BudgetImportResult)
def import_csv_confirm(mapping: BudgetColumnMapping, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        tableau = csv_import.get_pending(mapping.file_token)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    colonnes = set(tableau.colonnes)
    colonnes_attendues = {
        mapping.date_col,
        mapping.libelle_col,
        mapping.montant_col,
        mapping.debit_col,
        mapping.credit_col,
        mapping.categorie_col,
        mapping.sous_categorie_col,
    }
    colonnes_absentes = [c for c in colonnes_attendues if c and c not in colonnes]
    if colonnes_absentes:
        raise HTTPException(
            status_code=400,
            detail=tr("Colonne(s) introuvable(s) dans le fichier : {colonnes}", colonnes=", ".join(colonnes_absentes)),
        )

    foyer_id = auth_service.id_foyer(current_user)
    # Le format est reconnu à nouveau sur le fichier déposé, jamais cru sur parole :
    # c'est lui qui dit quelles catégories de la banque sont d'attente ou exclues.
    format_ = budget_formats_service.detecter_format(tableau.colonnes)
    mouvements, ignorees = budget_import_service.mouvements_depuis_lignes(
        tableau.lignes,
        mapping.date_col,
        mapping.libelle_col,
        mapping.montant_col,
        mapping.debit_col,
        mapping.credit_col,
        categorie_col=mapping.categorie_col,
        sous_categorie_col=mapping.sous_categorie_col,
        prefixes_a_categoriser=format_.prefixes_a_categoriser if format_ else (),
    )
    compte_id = _resoudre_compte(db, foyer_id, mapping)
    resultat = budget_import_service.importer_mouvements(
        db,
        foyer_id,
        mouvements,
        compte_id=compte_id,
        lignes_ignorees=ignorees,
        categories_exclues=format_.categories_exclues if format_ else frozenset(),
    )
    csv_import.clear_pending(mapping.file_token)
    return _resultat_et_trace(db, foyer_id, resultat)


def _resoudre_compte(db: Session, foyer_id: int, choix: CompteImportBancaire) -> int:
    """Compte du relevé (§ BM.1), même résolution que les imports courtier
    (`routers/portfolio.py::import_confirm`) : un id fourni doit appartenir au foyer
    (IDOR), un nom retrouve le compte existant ou le crée. Sans commit : le compte créé
    n'est enregistré qu'avec les mouvements, par `importer_mouvements`."""
    if choix.compte_id is not None:
        compte = db.get(Compte, choix.compte_id)
        if compte is None or compte.foyer_id != foyer_id:
            raise HTTPException(status_code=404, detail="Compte introuvable")
        return compte.id
    if choix.etablissement_id is not None:
        etablissement = db.get(Etablissement, choix.etablissement_id)
        if etablissement is None or etablissement.foyer_id != foyer_id:
            raise HTTPException(status_code=404, detail="Établissement introuvable")
        etablissement_id = etablissement.id
    else:
        etablissement_id = comptes_service.get_or_create_etablissement(
            db, foyer_id, choix.etablissement_nom, choix.etablissement_logo_key
        ).id
    return comptes_service.get_or_create_compte_sans_commit(db, foyer_id, choix.compte_nom, etablissement_id).id


def _resultat_et_trace(db: Session, foyer_id: int, resultat) -> BudgetImportResult:
    """Réponse d'import bancaire, en laissant au passage la trace « dernière source
    bancaire importée » qu'affiche l'écran Import (refonte du 22/09/2026). Le
    décompte retenu est le nombre de lignes LUES dans le fichier, pas les seules
    retenues : un ré-import du même relevé n'importe rien de neuf mais reste un
    import abouti, et afficher « 0 ligne » s'y lirait comme un échec."""
    journal_import_service.enregistrer(
        db,
        foyer_id,
        SOURCE_IMPORT_BANCAIRE,
        resultat.importees + resultat.doublons_ignores + resultat.lignes_ignorees,
    )
    return BudgetImportResult(**resultat.__dict__)


async def _import_fichier_structure(file: UploadFile, parseur) -> tuple[list, int]:
    content = await file.read()
    try:
        upload_limits.verifier_taille_fichier(content)
    except upload_limits.FichierTropVolumineuxError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    mouvements = parseur(content)
    return mouvements, 0


def _compte_du_formulaire(
    compte_id: Annotated[int | None, Form()] = None,
    compte_nom: Annotated[str | None, Form()] = None,
    etablissement_id: Annotated[int | None, Form()] = None,
    etablissement_nom: Annotated[str | None, Form()] = None,
    etablissement_logo_key: Annotated[str | None, Form()] = None,
) -> CompteImportBancaire:
    """Compte d'un import OFX/QIF, envoyé en champs de formulaire à côté du fichier.
    Un modèle `Form()` ne se combine pas à un `UploadFile` : les champs sont lus un à
    un, puis validés comme le JSON de l'import CSV."""
    try:
        return CompteImportBancaire(
            compte_id=compte_id,
            compte_nom=compte_nom,
            etablissement_id=etablissement_id,
            etablissement_nom=etablissement_nom,
            etablissement_logo_key=etablissement_logo_key,
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc


@router.post("/import/ofx", response_model=BudgetImportResult)
async def import_ofx(
    file: UploadFile,
    compte: CompteImportBancaire = Depends(_compte_du_formulaire),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    foyer_id = auth_service.id_foyer(current_user)
    mouvements, ignorees = await _import_fichier_structure(file, budget_import_service.parse_ofx)
    resultat = budget_import_service.importer_mouvements(
        db, foyer_id, mouvements, compte_id=_resoudre_compte(db, foyer_id, compte), lignes_ignorees=ignorees
    )
    return _resultat_et_trace(db, foyer_id, resultat)


@router.post("/import/qif", response_model=BudgetImportResult)
async def import_qif(
    file: UploadFile,
    compte: CompteImportBancaire = Depends(_compte_du_formulaire),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    foyer_id = auth_service.id_foyer(current_user)
    mouvements, ignorees = await _import_fichier_structure(file, budget_import_service.parse_qif)
    resultat = budget_import_service.importer_mouvements(
        db, foyer_id, mouvements, compte_id=_resoudre_compte(db, foyer_id, compte), lignes_ignorees=ignorees
    )
    return _resultat_et_trace(db, foyer_id, resultat)


# ---------------------------------------------------------------------------
# Mouvements
# ---------------------------------------------------------------------------


@router.get("/comptes", response_model=list[CompteOut])
def list_comptes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return budget_service.list_comptes_avec_mouvements(db, auth_service.id_foyer(current_user))


@router.get("/mouvements", response_model=list[MouvementBancaireOut])
def list_mouvements(
    date_debut: str | None = None,
    date_fin: str | None = None,
    categorie_id: int | None = None,
    compte_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return budget_service.list_mouvements(
        db,
        auth_service.id_foyer(current_user),
        date_debut=date_debut,
        date_fin=date_fin,
        categorie_id=categorie_id,
        compte_id=compte_id,
    )


@router.patch("/mouvements/{mouvement_id}", response_model=MouvementBancaireOut)
def categoriser_mouvement(
    mouvement_id: int,
    payload: MouvementCategorisationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return budget_service.categoriser_mouvement(db, auth_service.id_foyer(current_user), mouvement_id, payload.categorie_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Budget cible et résumé
# ---------------------------------------------------------------------------


@router.get("/cibles", response_model=list[BudgetCibleOut])
def list_cibles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return budget_service.list_cibles(db, auth_service.id_foyer(current_user))


@router.put("/cibles/{categorie_id}", response_model=BudgetCibleOut)
def set_cible(
    categorie_id: int, payload: BudgetCibleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    try:
        return budget_service.set_cible(db, auth_service.id_foyer(current_user), categorie_id, payload.montant_mensuel)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/cibles/{categorie_id}", status_code=204)
def delete_cible(categorie_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budget_service.delete_cible(db, auth_service.id_foyer(current_user), categorie_id)


@router.get("/summary", response_model=BudgetSummary)
def summary(
    date_debut: str,
    date_fin: str,
    compte_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return budget_service.compute_summary(db, auth_service.id_foyer(current_user), date_debut, date_fin, compte_id)


# ---------------------------------------------------------------------------
# Récurrences et jonction patrimoine (backlog 2.N.3/2.N.4)
# ---------------------------------------------------------------------------


@router.get("/recurrences", response_model=RecurrencesOut)
def recurrences(compte_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    detectees = budget_recurrences_service.detect_recurrences(db, auth_service.id_foyer(current_user), compte_id=compte_id)
    cout_annuel = budget_recurrences_service.cout_annuel_total(detectees)
    return {
        "recurrences": detectees,
        "cout_annuel_periodique": cout_annuel,
        "cout_mensuel_periodique": round(cout_annuel / 12, 2),
    }


@router.get("/jonction-patrimoine", response_model=JonctionPatrimoine)
def jonction_patrimoine(
    date_debut: str,
    date_fin: str,
    compte_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return budget_service.compute_jonction_patrimoine(db, auth_service.id_foyer(current_user), date_debut, date_fin, compte_id)
