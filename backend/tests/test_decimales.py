"""Verrouille les garanties de `app/decimales.py` (backlog § BI.1) : conversion
exacte, arrondi commercial dans tous les fils d'exécution, et colonne `Decimale`
qui ne contient jamais qu'une `Decimal` — en mémoire comme en base."""

import asyncio
import threading
from decimal import Decimal

import anyio.to_thread
import pytest
from sqlalchemy import Integer, create_engine, func, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from app.decimales import Decimale, arrondir, en_decimal


class _Base(DeclarativeBase):
    """Base isolée : un modèle de test ne doit pas entrer dans `app.database.Base`,
    que `test_alembic_migrations` compare au schéma réel."""


class _Ligne(_Base):
    __tablename__ = "ligne_test_decimales"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    montant: Mapped[Decimal] = mapped_column(Decimale(2))
    quantite: Mapped[Decimal | None] = mapped_column(Decimale(10), nullable=True)


@pytest.fixture
def session():
    moteur = create_engine("sqlite://")
    _Base.metadata.create_all(moteur)
    with Session(moteur) as s:
        yield s


# ---------------------------------------------------------------------------
# en_decimal / arrondir
# ---------------------------------------------------------------------------


def test_un_float_devient_la_decimale_saisie_pas_sa_valeur_binaire():
    assert Decimal(0.1) != Decimal("0.1")  # le piège évité
    assert en_decimal(0.1) == Decimal("0.1")
    assert en_decimal(1234.56) == Decimal("1234.56")


@pytest.mark.parametrize(
    ("valeur", "attendu"),
    [("2.675", "2.68"), ("1.005", "1.01"), ("0.125", "0.13"), ("10.075", "10.08"), ("-2.675", "-2.68")],
)
def test_arrondi_commercial_la_ou_le_flottant_perdait_un_centime(valeur, attendu):
    assert round(float(valeur), 2) != float(attendu)  # ce que faisait le flottant
    assert arrondir(Decimal(valeur)) == Decimal(attendu)
    assert en_decimal(float(valeur), 2) == Decimal(attendu)


@pytest.mark.parametrize("valeur", [float("nan"), float("inf"), float("-inf"), Decimal("NaN"), "Infinity"])
def test_nan_et_infini_refuses_bruyamment_jamais_stockes(valeur):
    """`Decimal("NaN").quantize(...)` ne lève PAS : sans refus explicite, un NaN
    traverserait l'arrondi et serait écrit en base."""
    with pytest.raises(ValueError, match="non finie"):
        en_decimal(valeur, 2)


# ---------------------------------------------------------------------------
# round() sur une Decimal : commercial dans TOUS les fils d'exécution
# ---------------------------------------------------------------------------


def _round_2675():
    return round(Decimal("2.675"), 2)


def test_round_commercial_dans_le_fil_principal():
    assert _round_2675() == Decimal("2.68")


def test_round_commercial_dans_un_nouveau_fil():
    """Un fil neuf part de `decimal.DefaultContext` : c'est lui qui est réglé."""
    resultat = []
    fil = threading.Thread(target=lambda: resultat.append(_round_2675()))
    fil.start()
    fil.join()
    assert resultat == [Decimal("2.68")]


def test_round_commercial_dans_le_pool_de_fils_de_fastapi():
    """Les routes synchrones de FastAPI s'exécutent via `anyio.to_thread`."""
    assert anyio.run(anyio.to_thread.run_sync, _round_2675) == Decimal("2.68")


def test_round_commercial_dans_une_tache_asyncio():
    async def tache():
        return _round_2675()

    assert asyncio.run(tache()) == Decimal("2.68")


# ---------------------------------------------------------------------------
# Colonne Decimale
# ---------------------------------------------------------------------------


def test_colonne_convertit_des_la_construction_et_laffectation():
    """Garantie centrale : un float affecté devient une Decimal tout de suite, pas
    au prochain rechargement — sinon un même objet porterait tantôt l'un, tantôt
    l'autre selon son histoire."""
    ligne = _Ligne(montant=2.675, quantite=0.1)
    assert ligne.montant == Decimal("2.68") and isinstance(ligne.montant, Decimal)
    assert ligne.quantite == Decimal("0.1000000000")
    ligne.montant = 10.075
    assert ligne.montant == Decimal("10.08")
    ligne.quantite = None
    assert ligne.quantite is None


def test_colonne_relue_en_base_a_lidentique(session):
    session.add(_Ligne(montant=Decimal("1234.56"), quantite=Decimal("0.00012345")))
    session.commit()
    session.expire_all()
    ligne = session.scalars(select(_Ligne)).one()
    assert ligne.montant == Decimal("1234.56")
    assert ligne.quantite == Decimal("0.0001234500")


def test_somme_en_base_exacte(session):
    session.add_all([_Ligne(montant=Decimal("0.10")) for _ in range(10)])
    session.commit()
    assert session.scalar(select(func.sum(_Ligne.montant))) == Decimal("1.00")


def test_valeur_bruitee_deja_en_base_relue_propre(session):
    """Une base existante contient des flottants bruités, écrits avant § BI.1 : ils
    doivent se relire à l'échelle, sans reprise de données."""
    session.execute(text("INSERT INTO ligne_test_decimales (id, montant) VALUES (1, 1234.5699999999999)"))
    session.commit()
    assert session.get(_Ligne, 1).montant == Decimal("1234.57")
