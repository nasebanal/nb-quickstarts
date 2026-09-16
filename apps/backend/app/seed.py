from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Item

_SAMPLE_ITEMS = [
    {"name": "Sample Item A", "quantity": 10},
    {"name": "Sample Item B", "quantity": 5},
    {"name": "Sample Item C", "quantity": 0},
]


def seed_if_empty(db: Session) -> None:
    count = db.scalar(select(func.count()).select_from(Item))
    if count:
        return
    for data in _SAMPLE_ITEMS:
        db.add(Item(source="seed", **data))
    db.commit()
