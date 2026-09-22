"""Trace du dernier import abouti par source de fichier (refonte de l'écran Import,
22/09/2026). Seul point d'accès à `models.JournalImport`.

`enregistrer` est appelé par chaque route de confirmation d'import, APRÈS son
`db.commit()` : la date affichée à l'écran atteste d'un import réellement abouti, et
non d'une tentative annulée en cours de route (l'import de relevé de positions, par
exemple, est transactionnel et peut se solder par un rollback complet).
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from ..models import JournalImport


def enregistrer(db: Session, user_id: int, source: str, nb_lignes: int | None = None) -> None:
    """Mémorise « cette source vient d'être importée ». Commit inclus : les appelants
    ont déjà validé leur propre transaction quand ils arrivent ici, et une trace
    laissée non committée ne survivrait pas à la fin de la requête."""
    entree = db.query(JournalImport).filter(JournalImport.user_id == user_id, JournalImport.source == source).first()
    if entree is None:
        entree = JournalImport(user_id=user_id, source=source)
        db.add(entree)
    entree.importe_le = datetime.now(UTC)
    entree.nb_lignes = nb_lignes
    db.commit()


def lister(db: Session, user_id: int) -> list[JournalImport]:
    """Les sources déjà importées au moins une fois par ce foyer. Une source jamais
    importée est simplement absente — c'est au frontend d'afficher « jamais importé »
    plutôt qu'au backend d'inventer une entrée à date nulle pour chaque source
    connue."""
    return db.query(JournalImport).filter(JournalImport.user_id == user_id).all()
