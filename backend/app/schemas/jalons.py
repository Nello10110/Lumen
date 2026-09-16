from __future__ import annotations

from datetime import date

from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Jalons personnels — célébrations et badges (backlog §§ AG.3/AG.4)
# ---------------------------------------------------------------------------


class JalonOut(BaseModel):
    id: str
    titre: str
    description: str
    atteint: bool
    date_atteint: date | None
    nouveau: bool
