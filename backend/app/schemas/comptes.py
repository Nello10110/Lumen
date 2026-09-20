from __future__ import annotations

from datetime import datetime  # noqa: F401

from pydantic import BaseModel, ConfigDict, field_validator, model_validator  # noqa: F401


class EtablissementBase(BaseModel):
    nom: str

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide")
        return v


class EtablissementCreate(EtablissementBase):
    # Clé du catalogue d'établissements connus (revue import, 05/09/2026) — `None`
    # pour un établissement personnalisé. Purement décorative côté serveur (aucune
    # validation contre le catalogue, qui vit côté frontend et peut évoluer sans
    # migration) : une clé inconnue retombe simplement sur le badge neutre à l'écran.
    logo_key: str | None = None


class EtablissementUpdate(BaseModel):
    nom: str | None = None
    logo_key: str | None = None

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide")
        return v


class EtablissementLogoUrlInput(BaseModel):
    """URL d'une image à récupérer côté serveur (retour utilisateur, 05/09/2026).
    Validée pour de bon dans `services/logo_service._verifier_url_publique` (schéma,
    résolution DNS, plages privées) : ici, seul le nettoyage de surface."""

    url: str

    @field_validator("url")
    @classmethod
    def _valider_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("L'adresse ne peut pas être vide")
        return v


class EtablissementOut(EtablissementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    logo_key: str | None = None
    # Logo réel : jamais l'image elle-même ici (ce schéma est imbriqué dans chaque
    # `CompteOut`, donc dupliqué des dizaines de fois par réponse) — seulement de quoi
    # savoir qu'il existe et d'où il vient. L'image est servie par
    # `GET /api/comptes/etablissements/logos`.
    a_un_logo: bool = False
    logo_source: str | None = None
    logo_maj_le: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CompteBase(BaseModel):
    nom: str
    # `None` : aucun établissement rattaché (« Sans établissement » à l'écran) — pas
    # vérifié ici (pas d'accès DB dans un validateur Pydantic), l'IDOR est contrôlé
    # côté routeur/service, comme `LoanUpdate.holding_id`.
    etablissement_id: int | None = None

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide")
        return v


class CompteCreate(CompteBase):
    # Établissement OBLIGATOIRE à la création (revue du 03/09/2026, demande directe
    # de l'utilisateur : « il n'est pas possible d'avoir des comptes sans
    # établissement »). Réécrit ici plutôt que sur `CompteBase`, dont hérite aussi
    # `CompteOut` : une LECTURE doit rester capable de représenter un compte déjà
    # existant sans établissement (créé avant cette règle) — seule la création est
    # cadrée par cette demande, pas la modification d'un compte existant.
    etablissement_id: int


class CompteUpdate(BaseModel):
    nom: str | None = None
    etablissement_id: int | None = None

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide")
        return v


class CompteOut(CompteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    etablissement: EtablissementOut | None = None
    created_at: datetime
    updated_at: datetime


class ZoneGeoCompteUpdate(BaseModel):
    """Retour utilisateur du 17/09/2026 (§ AP.3) : « pouvoir éditer sur un compte
    entier (donc tous les actifs qui le composent en même temps) la géographie » —
    applique la MÊME zone à chaque ligne rattachée au compte en une seule action,
    même patron que `QuotitesUpdate`. `zone_geo=None` efface la déclaration
    manuelle sur chaque ligne (retour à la détection automatique, cf.
    `analysis_service.value_holdings`). Pas de validation contre `ZONES_GEO` ici :
    ce champ reste un texte libre côté serveur comme `HoldingUpdate.zone_geo`, la
    liste fermée n'existant que côté frontend (sélecteur)."""

    zone_geo: str | None = None


class SecteurCompteUpdate(BaseModel):
    """Même mécanique que `ZoneGeoCompteUpdate` juste au-dessus, pour le secteur
    (retour utilisateur du 17/09/2026, § AP.3 : « pouvoir éditer de la même façon
    la répartition sectorielle »)."""

    secteur: str | None = None


class CompteAvecSoldeOut(BaseModel):
    """Un compte avec sa valeur agrégée (`services/comptes_service.solde_par_compte`)
    — écran Comptes uniquement, jamais utilisé pour les routes CRUD nues. `compte`
    enveloppé (pas aplati sur `CompteOut`) : `None` représente le bucket « Sans
    compte » (lignes du foyer non rattachées), qui n'a pas d'existence en base."""

    compte: CompteOut | None
    solde: float
    nombre_lignes: int
    # Retour utilisateur du 09/09/2026 : au moins une ligne (ou un emprunt qui lui
    # est rattaché) a une répartition entre détenteurs COMMENCÉE mais qui ne somme
    # plus à 100 % — le plus souvent parce qu'un détenteur qui y avait une part a
    # été supprimé depuis. `False` pour une répartition jamais commencée : c'est un
    # état valide, cf. `services/comptes_service._holdings_repartition_incomplete`.
    repartition_incomplete: bool
    # Retour utilisateur du 20/09/2026 : au moins une ligne de ce compte n'a AUCUNE
    # répartition entre détenteurs (jamais renseignée, pas rompue) — signalé pour
    # INVITER à la définir, jamais avec la même alerte que `repartition_incomplete`
    # ci-dessus, dont le sens (une erreur à corriger) est tout autre. Toujours
    # `False` si le foyer a moins de deux détenteurs déclarés (rien à répartir), et
    # toujours `False` pour le bucket « Sans compte » (pas de fiche à ouvrir pour y
    # répondre), cf. `services/comptes_service.solde_par_compte`.
    repartition_non_renseignee: bool
    # Dernière activité utilisateur sur ce compte (demande directe du 16/09/2026) :
    # le plus récent entre `Compte.updated_at` (renommage, changement
    # d'établissement) et `Holding.updated_at` de chacune de ses lignes (édition,
    # import qui les recalcule) — jamais la fraîcheur d'un cours de marché
    # (`MarketDataCache.derniere_maj`, automatique), cf.
    # `services/comptes_service.solde_par_compte`. `None` pour le bucket « Sans
    # compte » (pas une entité, rien à dater) ou un compte sans aucune ligne.
    derniere_maj: datetime | None
