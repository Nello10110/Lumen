"""Un foyer REMPLI pour les tests de suppression (§ BK.2c) : au moins une ligne dans chaque
table qui se rattache à un foyer — patrimoine, réglages, liens de partage, invitations,
appartenances, sessions, historiques en cache — et des comptes de chaque rôle.

`tests/test_suppression_foyer.py` exige qu'une table rattachée à un foyer ne soit jamais
vide ici : une table ajoutée plus tard fait échouer ce test tant qu'elle n'est pas peuplée
par `peupler_foyer`, ce qui la fait entrer dans la vérification.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.models import (
    ROLE_INVITE,
    ROLE_MEMBRE,
    ROLE_PROPRIETAIRE,
    Appartenance,
    AuthToken,
    BudgetCible,
    CategorieBudget,
    Compte,
    Detenteur,
    Etablissement,
    FoyerParametre,
    HistoriqueCache,
    HoldingImmobilierDetail,
    HoldingValuationHistory,
    JournalImport,
    LienPartage,
    Loan,
    MouvementBancaire,
    PartageAcces,
    PerimetreInvite,
    QuotiteHolding,
    QuotiteLoan,
    RegleCategorisation,
    Salaire,
    User,
)
from app.services import auth_service, invitation_service

from .conftest import make_holding, make_transaction


@dataclass
class FoyerPeuple:
    foyer_id: int
    proprietaire_id: int
    membre: User
    invite: User
    detenteur: Detenteur
    holding_id: int


def _session(db, user_id: int, foyer_id: int | None, jeton: str) -> AuthToken:
    maintenant = datetime.now()
    session = AuthToken(
        token_hash=auth_service.hacher_jeton(jeton), id_session=jeton[:16], user_id=user_id, foyer_id=foyer_id, created_at=maintenant, expires_at=maintenant + timedelta(days=30)
    )
    db.add(session)
    return session


def _compte(db, username: str, foyer_id: int, role: str) -> User:
    utilisateur = User(username=username, password_hash="inutilisé")
    db.add(utilisateur)
    db.flush()
    db.add(Appartenance(user_id=utilisateur.id, foyer_id=foyer_id, role=role))
    db.flush()
    return utilisateur


def peupler_foyer(db, foyer_id: int, etiquette: str) -> FoyerPeuple:
    """`foyer_id` existe déjà, avec son propriétaire (`conftest.creer_utilisateur`) ;
    `etiquette` rend uniques les noms et identifiants propres à chaque foyer."""
    proprietaire_id = (
        db.query(Appartenance.user_id).filter(Appartenance.foyer_id == foyer_id, Appartenance.role == ROLE_PROPRIETAIRE).scalar()
    )
    membre = _compte(db, f"membre-{etiquette}", foyer_id, ROLE_MEMBRE)
    invite = _compte(db, f"invite-{etiquette}", foyer_id, ROLE_INVITE)

    etablissement = Etablissement(foyer_id=foyer_id, nom=f"Banque {etiquette}")
    db.add(etablissement)
    db.flush()
    compte = Compte(foyer_id=foyer_id, nom=f"PEA {etiquette}", etablissement_id=etablissement.id)
    detenteur = Detenteur(foyer_id=foyer_id, nom=f"Alice {etiquette}")
    db.add_all([compte, detenteur])
    db.commit()

    holding = make_holding(db, foyer_id=foyer_id, ticker=f"AAA-{etiquette}", compte_id=compte.id)
    maison = make_holding(db, foyer_id=foyer_id, ticker=f"MAISON-{etiquette}", type_actif="REAL_ESTATE")
    db.add_all(
        [
            HoldingImmobilierDetail(holding_id=maison.id, type_location="nue"),
            HoldingValuationHistory(holding_id=maison.id, valeur=300000, date_valeur=datetime(2026, 1, 1)),
            QuotiteHolding(holding_id=holding.id, detenteur_id=detenteur.id, quotite_pct=100),
        ]
    )
    pret = Loan(
        foyer_id=foyer_id,
        libelle=f"Prêt {etiquette}",
        capital_initial=200000,
        taux_annuel_pct=3,
        mensualite=1000,
        date_debut=datetime(2021, 6, 15),
        duree_mois=240,
        holding_id=maison.id,
        etablissement_id=etablissement.id,
    )
    db.add(pret)
    db.flush()
    db.add(QuotiteLoan(loan_id=pret.id, detenteur_id=detenteur.id, quotite_pct=100))
    make_transaction(db, foyer_id=foyer_id, transaction_id=f"tx-{etiquette}", symbol=f"AAA-{etiquette}", compte_id=compte.id)
    db.add(
        Salaire(foyer_id=foyer_id, annee=2026, nom=f"Salaire {etiquette}", montant=45000, type_montant="brut", periodicite="annuel", statut="cadre", detenteur_id=detenteur.id)
    )

    racine = CategorieBudget(foyer_id=foyer_id, nom=f"Courses {etiquette}")
    db.add(racine)
    db.flush()
    fille = CategorieBudget(foyer_id=foyer_id, nom=f"Marché {etiquette}", parent_id=racine.id)
    db.add(fille)
    db.flush()
    db.add_all(
        [
            MouvementBancaire(
                foyer_id=foyer_id, transaction_id=f"mv-{etiquette}", date="2026-01-02", libelle="Boulangerie", montant=-4.5, compte_id=compte.id, categorie_id=fille.id
            ),
            RegleCategorisation(foyer_id=foyer_id, motif="boulangerie", categorie_id=racine.id),
            BudgetCible(foyer_id=foyer_id, categorie_id=racine.id, montant_mensuel=300),
            JournalImport(foyer_id=foyer_id, source="releve", nb_lignes=1),
            FoyerParametre(foyer_id=foyer_id, cle="methode_cout", valeur="fifo"),
        ]
    )

    lien = LienPartage(
        token_hash=auth_service.hacher_jeton(f"lien-{etiquette}"),
        foyer_id=foyer_id,
        nom=f"Lien {etiquette}",
        detenteur_id=detenteur.id,
        expires_at=datetime.now() + timedelta(days=30),
    )
    db.add(lien)
    db.flush()
    db.add(PartageAcces(lien_id=lien.id, resultat="succes"))
    db.add(PerimetreInvite(user_id=invite.id, detenteur_id=detenteur.id))
    db.commit()
    invitation_service.creer_invitation(
        db, foyer_id, proprietaire_id, role=ROLE_INVITE, libelle=f"Pour {etiquette}", duree_jours=7, detenteur_ids=[detenteur.id]
    )

    for compte_de_session in (proprietaire_id, membre.id, invite.id):
        _session(db, compte_de_session, foyer_id, f"jeton-{etiquette}-{compte_de_session}")
    db.add_all(
        [
            HistoriqueCache(cle=f"historique_portefeuille:{foyer_id}", contenu_json="[]"),
            HistoriqueCache(cle=f"historique_portefeuille:{foyer_id}:AAA-{etiquette}:-", contenu_json="[]"),
            HistoriqueCache(cle=f"historique_patrimoine:{foyer_id}:foyer", contenu_json="[]"),
            HistoriqueCache(cle=f"historique_patrimoine:{foyer_id}:{detenteur.id}:STOCK:-:-", contenu_json="[]"),
        ]
    )
    db.commit()
    return FoyerPeuple(foyer_id, proprietaire_id, membre, invite, detenteur, holding.id)
