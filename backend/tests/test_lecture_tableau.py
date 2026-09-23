"""Verrouille la lecture des fichiers importés sans pandas (backlog § BI.2) :
`services/lecture_tableau.py`, et les défauts de l'ancienne lecture par pandas que
son remplacement a corrigés — chacun a son test ci-dessous, pour ne jamais revenir.
"""

import io
from datetime import datetime

import pytest
from openpyxl import Workbook

from app.models import Holding
from app.services import budget_import_service, csv_import
from app.services.lecture_tableau import lire_csv, lire_csv_separateur_detecte, lire_excel, lire_fichier


def _xlsx(*feuilles: list[list], active: int = 0) -> bytes:
    classeur = Workbook()
    classeur.remove(classeur.active)
    for i, rangees in enumerate(feuilles):
        feuille = classeur.create_sheet(f"F{i}")
        for rangee in rangees:
            feuille.append(rangee)
    classeur.active = active
    tampon = io.BytesIO()
    classeur.save(tampon)
    return tampon.getvalue()


# ---------------------------------------------------------------------------
# CSV — forme du fichier
# ---------------------------------------------------------------------------


def test_csv_cellules_rendues_en_texte_brut():
    tableau = lire_csv(b"ticker,quantite,code\nAAPL,10,000660\n")
    assert tableau.colonnes == ["ticker", "quantite", "code"]
    # Jamais de type deviné : « 000660 » n'est pas l'entier 660, « 10 » n'est pas 10.0.
    assert tableau.lignes == [{"ticker": "AAPL", "quantite": "10", "code": "000660"}]


def test_csv_bom_crlf_et_guillemets():
    contenu = '\ufeffnom,note\r\n"Dupont, Jean","ligne 1\nligne 2"\r\n'.encode()
    tableau = lire_csv(contenu)
    assert tableau.colonnes == ["nom", "note"]
    assert tableau.lignes == [{"nom": "Dupont, Jean", "note": "ligne 1\nligne 2"}]


def test_csv_lignes_blanches_ignorees_meme_faites_despaces_ou_de_separateurs():
    tableau = lire_csv(b"a,b\n\n1,2\n   \n,,\n3,4\n\n")
    assert [dict(ligne) for ligne in tableau.lignes] == [{"a": "1", "b": "2"}, {"a": "3", "b": "4"}]


def test_csv_numero_de_ligne_du_fichier_conserve_malgre_les_lignes_ignorees():
    """« Ligne 5 : quantité invalide » doit désigner la ligne 5 du tableur de
    l'utilisateur, pas un rang recalculé après filtrage des lignes blanches."""
    tableau = lire_csv(b"a,b\n1,2\n\n\n3,4\n")
    assert [ligne.numero for ligne in tableau.lignes] == [2, 5]


def test_csv_ligne_courte_completee_par_des_cellules_vides():
    tableau = lire_csv(b"a,b,c\n1,2\n")
    assert tableau.lignes == [{"a": "1", "b": "2", "c": ""}]


def test_csv_separateur_final_sur_les_donnees_seules_ne_decale_rien():
    """Défaut de pandas : `a,b` / `1,2,` faisait de la première colonne un index
    implicite et DÉCALAIT chaque valeur d'une colonne vers la gauche (`a='2'`,
    `b=''`, le `1` perdu), sans rien signaler."""
    tableau = lire_csv(b"a,b\n1,2,\n3,4,\n")
    assert [dict(ligne) for ligne in tableau.lignes] == [{"a": "1", "b": "2"}, {"a": "3", "b": "4"}]


def test_csv_champs_en_trop_non_vides_refusent_le_fichier_en_nommant_la_ligne():
    with pytest.raises(ValueError, match="Ligne 3 : 3 champs trouvés, 2 attendus"):
        lire_csv(b"a,b\n1,2\n5,6,7\n")


def test_csv_entetes_vides_et_doublons_restent_distinguables():
    tableau = lire_csv(b" a ,,a,a\n1,2,3,4\n")
    assert tableau.colonnes == ["a", "Unnamed: 1", "a.1", "a.2"]


def test_csv_non_utf8_refuse_avec_un_message_qui_dit_quoi_faire():
    with pytest.raises(ValueError, match="UTF-8"):
        lire_csv("a,b\nr\xe9sum\xe9,1\n".encode("latin-1"))


def test_csv_vide_refuse():
    with pytest.raises(ValueError, match="vide"):
        lire_csv(b"")


# ---------------------------------------------------------------------------
# CSV — détection du séparateur (import générique)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("contenu", "colonnes"),
    [
        (b"ticker;quantite\nAAPL;10\n", ["ticker", "quantite"]),
        (b"ticker,quantite\nAAPL,10\n", ["ticker", "quantite"]),
        (b"ticker\tquantite\nAAPL\t10\n", ["ticker", "quantite"]),
        # Défaut hérité de pandas : le détecteur de la bibliothèque standard, laissé
        # libre, prenait « t » pour séparateur et produisait une colonne « icker ».
        (b"ticker\nAAPL\n", ["ticker"]),
    ],
)
def test_separateur_detecte(contenu, colonnes):
    assert lire_csv_separateur_detecte(contenu).colonnes == colonnes


def test_separateur_detecte_ne_fusionne_jamais_deux_colonnes_en_un_nombre():
    """Défaut de l'ancienne cascade autour de pandas : la virgule détectée butait
    sur une ligne malformée, le repli sur « ; » réussissait en rangeant chaque
    ligne dans UNE colonne « a,b », et `to_float("1,2")` y lisait le décimal
    français 1,2. Désormais l'erreur précise est remontée."""
    with pytest.raises(ValueError, match="Ligne 3"):
        lire_csv_separateur_detecte(b"a,b\n1,2\n5,6,7\n")


def test_separateur_detecte_avec_decimales_francaises():
    tableau = lire_csv_separateur_detecte(b"ticker;quantite\nBTC;0,00012345\n")
    assert csv_import.to_float(tableau.lignes[0]["quantite"]) == pytest.approx(0.00012345)


# ---------------------------------------------------------------------------
# Excel
# ---------------------------------------------------------------------------


def test_excel_conversion_des_types_de_cellule_identique_a_pandas():
    contenu = _xlsx(
        [
            ["texte", "entier", "reel", "reel_entier", "date", "booleen", "vide"],
            ["abc", 10, 12.5, 10.0, datetime(2026, 9, 13), True, None],
        ]
    )
    assert lire_excel(contenu).lignes == [
        {
            "texte": "abc",
            "entier": "10",
            "reel": "12.5",
            "reel_entier": "10",
            "date": "2026-09-13 00:00:00",
            "booleen": "True",
            "vide": "",
        }
    ]


def test_excel_lit_la_premiere_feuille_pas_la_feuille_active():
    contenu = _xlsx([["premiere"], [1]], [["seconde"], [2]], active=1)
    assert lire_excel(contenu).colonnes == ["premiere"]


def test_excel_ligne_vide_avant_len_tete_ignoree():
    """Défaut de pandas : la ligne vide devenait l'en-tête (« Unnamed: 0 »…) et la
    vraie en-tête une ligne de données."""
    tableau = lire_excel(_xlsx([[None], ["a", "b"], [1, 2]]))
    assert tableau.colonnes == ["a", "b"]
    assert tableau.lignes == [{"a": "1", "b": "2"}]
    assert tableau.lignes[0].numero == 3


def test_excel_donnee_plus_large_que_len_tete_elargit_len_tete():
    tableau = lire_excel(_xlsx([["a", "b"], [1, 2, 3]]))
    assert tableau.colonnes == ["a", "b", "Unnamed: 2"]


def test_excel_corrompu_refuse_en_valueerror():
    with pytest.raises(ValueError, match="illisible"):
        lire_excel(b"ceci n'est pas un classeur")


def test_xls_refuse_avec_un_message_clair():
    """`.xls` exigeait `xlrd`, absent des dépendances : l'extension était acceptée
    puis la lecture levait une `ImportError`, que les routeurs laissaient remonter
    en erreur 500."""
    with pytest.raises(ValueError, match=r"\.xls"):
        lire_fichier("releve.xls", b"peu importe")


# ---------------------------------------------------------------------------
# to_float
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("valeur", [float("nan"), float("inf"), "inf", "-inf", "nan", "NaN", "", None, "abc"])
def test_to_float_ne_rend_jamais_nan_ni_infini(valeur):
    assert csv_import.to_float(valeur) is None


# ---------------------------------------------------------------------------
# Défauts corrigés, vérifiés de bout en bout
# ---------------------------------------------------------------------------


def test_import_positions_quantite_vide_ecarte_la_ligne_sans_bloquer_les_autres(client, db):
    """Avec pandas, la cellule vide devenait `NaN`, que `to_float` laissait passer :
    la ligne franchissait le garde-fou `quantite is None`. Elle doit être écartée,
    nommée, et les autres importées."""
    contenu = b"ticker;quantite\nAAA;10\nBBB;\nCCC;3\n"
    preview = client.post("/api/portfolio/import/preview", files={"file": ("releve.csv", contenu, "text/csv")}).json()
    assert preview["rows"][1] == {"ticker": "BBB", "quantite": ""}

    reponse = client.post(
        "/api/portfolio/import/confirm",
        json={"file_token": preview["file_token"], "ticker_col": "ticker", "quantite_col": "quantite", "replace_existing": False},
    )

    assert reponse.status_code == 200, reponse.text
    corps = reponse.json()
    assert corps["imported"] == 2
    assert corps["skipped"] == 1
    assert corps["errors"] == ["Ligne 3: ticker ou quantité invalide"]
    assert {h.ticker: h.quantite for h in db.query(Holding).all()} == {"AAA": 10.0, "CCC": 3.0}


def test_import_bancaire_libelle_vide_nest_pas_enregistre_comme_nan():
    """Avec pandas, un libellé vide devenait `str(NaN)`, soit le texte « nan »."""
    tableau = lire_csv_separateur_detecte(b"Date;Libelle;Montant\n01/02/2026;;-12,50\n")
    mouvements, ignorees = budget_import_service.mouvements_depuis_lignes(tableau.lignes, "Date", "Libelle", "Montant", None, None)
    assert ignorees == 0
    assert mouvements[0].libelle == "(sans libellé)"


def test_aucun_module_applicatif_nimporte_pandas():
    """`pandas` reste installé (exigé par `yfinance`), donc rien n'empêcherait de le
    réimporter par réflexe : ce test l'empêche. Le code applicatif n'en a plus
    besoin, et son retrait est le préalable à tout remplacement de `yfinance`."""
    import pathlib
    import re

    racine = pathlib.Path(__file__).resolve().parent.parent / "app"
    motif = re.compile(r"^\s*(import pandas|from pandas)\b", re.M)
    fautifs = [str(f.relative_to(racine)) for f in racine.rglob("*.py") if motif.search(f.read_text(encoding="utf-8"))]
    assert fautifs == []
