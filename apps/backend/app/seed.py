from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Item

# A tiny, coherent chart of accounts (not arbitrary "Item A/B/C" labels),
# matching the app's accounting-ledger framing: opened Cash with a deposit,
# paid rent (Cash down, Rent Expense up by the same amount), then got paid
# by a customer (Cash up, Sales Revenue up). Multiple events land on "Cash"
# specifically, so the seed data itself demonstrates the event-sourcing
# pattern (a name's balance is the sum of its events) rather than looking
# like a flat one-row-per-account table.
# Final balances: Cash = 120000 (100000 - 30000 + 50000), Sales Revenue =
# 50000, Rent Expense = 30000.
_SAMPLE_EVENTS = [
    {"name": "Cash", "quantity": 100000},
    {"name": "Rent Expense", "quantity": 30000},
    {"name": "Cash", "quantity": -30000},
    {"name": "Sales Revenue", "quantity": 50000},
    {"name": "Cash", "quantity": 50000},
]


def seed_if_empty(db: Session) -> None:
    count = db.scalar(select(func.count()).select_from(Item))
    if count:
        return
    for data in _SAMPLE_EVENTS:
        db.add(Item(source="seed", **data))
    db.commit()
