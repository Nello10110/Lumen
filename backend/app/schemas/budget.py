from __future__ import annotations

from datetime import datetime  # noqa: F401

from pydantic import BaseModel, ConfigDict, field_validator, model_validator  # noqa: F401

from .commun import ImportPreviewResponse

# ---------------------------------------------------------------------------
# Budget (backlog 2.N.1/2.N.2)
# ---------------------------------------------------------------------------


class CategorieBudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str
    parent_id: int | None = None
    exclue_des_totaux: bool = False


class CategorieBudgetCreate(BaseModel):
    nom: str
    parent_id: int | None = None

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom de la catégorie ne peut pas être vide")
        return v


class FusionCategorieRequest(BaseModel):
    cible_id: int


class ApercuFusionOut(BaseModel):
    """Ce qu'une fusion de catégories déplace (§ BM.4), montré avant confirmation."""

    mouvements: int
    regles: int
    sous_categories_deplacees: int
    sous_categories_fusionnees: int
    budget_transfere: bool
    budget_abandonne: bool
    exclusion_differente: bool


class CategorieBudgetUpdate(BaseModel):
    """Renommage et/ou exclusion des totaux (§ BM.3) : un champ absent reste inchangé."""

    nom: str | None = None
    exclue_des_totaux: bool | None = None

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Le nom de la catégorie ne peut pas être vide")
        return v


class RegleCategorisationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    motif: str
    categorie_id: int


class RegleCategorisationCreate(BaseModel):
    motif: str
    categorie_id: int

    @field_validator("motif")
    @classmethod
    def _valider_motif(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le motif ne peut pas être vide")
        return v


class RegleReapplicationResult(BaseModel):
    mouvements_modifies: int


class MouvementBancaireOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: str
    libelle: str
    montant: float
    compte_id: int | None = None
    categorie_id: int | None = None
    categorise_manuellement: bool


class MouvementCategorisationUpdate(BaseModel):
    categorie_id: int | None = None


class CompteImportBancaire(BaseModel):
    """Compte du relevé importé (§ BM.1), obligatoire comme pour les imports courtier :
    un compte existant du foyer (`compte_id`, appartenance vérifiée par le routeur), ou
    un nouveau compte (`compte_nom`) avec son établissement, existant ou créé à la
    volée. `compte_id` prime sur `compte_nom`, `etablissement_id` sur `etablissement_nom`."""

    compte_id: int | None = None
    compte_nom: str | None = None
    etablissement_id: int | None = None
    etablissement_nom: str | None = None
    etablissement_logo_key: str | None = None

    @field_validator("compte_nom", "etablissement_nom")
    @classmethod
    def _nettoyer_nom(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        return v or None

    @model_validator(mode="after")
    def _valider_compte(self) -> CompteImportBancaire:
        if self.compte_id is None:
            if not self.compte_nom:
                raise ValueError("Choisissez le compte bancaire de ce relevé.")
            if self.etablissement_id is None and not self.etablissement_nom:
                raise ValueError("Un établissement est obligatoire pour créer le compte.")
        return self


class BudgetColumnMapping(CompteImportBancaire):
    file_token: str
    date_col: str
    libelle_col: str
    montant_col: str | None = None
    debit_col: str | None = None
    credit_col: str | None = None
    # Catégorie et sous-catégorie données par la banque (§ BM.3), reprises telles quelles.
    categorie_col: str | None = None
    sous_categorie_col: str | None = None

    @field_validator("date_col", "libelle_col")
    @classmethod
    def _valider_colonne_obligatoire(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("La colonne est obligatoire")
        return v

    @model_validator(mode="after")
    def _valider_montant_ou_debit_credit(self) -> BudgetColumnMapping:
        if not self.montant_col and not (self.debit_col or self.credit_col):
            raise ValueError("Indique une colonne montant, ou au moins une colonne débit/crédit")
        return self


class BudgetImportResult(BaseModel):
    lignes_lues: int
    importees: int
    doublons_ignores: int
    lignes_ignorees: int
    categorisees_automatiquement: int
    categorisees_par_la_banque: int


class FormatBancaireOut(BaseModel):
    code: str
    nom: str


class BudgetImportPreviewResponse(ImportPreviewResponse):
    """Aperçu d'un relevé CSV, avec le format reconnu (§ BM.3) et le mapping qu'il
    suggère (champ du mapping → en-tête exact du fichier) ; `None` et vide sinon."""

    format_detecte: FormatBancaireOut | None = None
    mapping_suggere: dict[str, str] = {}


class BudgetCibleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    categorie_id: int
    montant_mensuel: float


class BudgetCibleUpdate(BaseModel):
    montant_mensuel: float

    @field_validator("montant_mensuel")
    @classmethod
    def _valider_montant_positif(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Le budget cible ne peut pas être négatif")
        return v


class RepartitionSortieItem(BaseModel):
    categorie_id: int | None
    categorie_nom: str
    montant: float
    cible_mensuelle: float | None = None


class BudgetSummary(BaseModel):
    entrees: float
    sorties: float
    disponible: float
    depenses_recurrentes_mensuelles: float
    repartition_sorties: list[RepartitionSortieItem]


class RecurrenceDetecteeOut(BaseModel):
    libelle: str
    categorie_id: int | None
    montant_actuel: float
    montant_precedent: float | None
    # Montant de la première occurrence de la fenêtre observée, et variation de la
    # dernière par rapport à elle (§ BM.2) : une hausse progressive, par petits pas sous
    # le seuil, n'apparaît que sur cette comparaison.
    montant_initial: float
    variation_prix_pct: float | None
    hausse_prix: bool
    occurrences: int
    premiere_date: str
    derniere_date: str
    periodicite: str  # "mensuelle" | "trimestrielle" | "annuelle" | "irreguliere"
    # Montant actuel × nombre de prélèvements par an (mensuel depuis un an au moins : somme
    # réelle des douze derniers mois) ; `None` pour une charge irrégulière, dont on ne sait
    # pas combien de fois par an elle reviendra.
    cout_annuel_estime: float | None
    total_periode: float  # somme des occurrences de la fenêtre observée


class RecurrencesOut(BaseModel):
    recurrences: list[RecurrenceDetecteeOut]
    # Somme des `cout_annuel_estime` des séries périodiques renvoyées (§ BM.4), et sa part
    # mensuelle : calculées ici pour que l'écran n'additionne pas des montants.
    cout_annuel_periodique: float
    cout_mensuel_periodique: float


class JonctionPatrimoine(BaseModel):
    taux_epargne_reel_pct: float | None
    reste_a_vivre: float | None
    versement_mensuel_suggere: float | None
    versement_mensuel_epargne_declare: float
    categorie_epargne_introuvable: bool
    categorie_logement_introuvable: bool
