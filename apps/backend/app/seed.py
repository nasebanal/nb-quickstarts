from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Account, User
from app.passwords import hash_password

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


# The initial user - the one the demo login accepts, and the one every test
# tool logs in as (Playwright, Locust, kafka-bridge, Specmatic). Deliberately
# obvious - demo / demo - because this is seed data for a local demo, not a
# credential to protect. The hash is stored, never the password itself.
DEMO_PASSWORD = "demo"
_SEED_USERS = [
    {"username": "demo", "email": "demo@nasebanal.com", "display_name": "Demo User", "language": "ja"},
]


def seed_if_empty(db: Session) -> None:
    if not db.scalar(select(func.count()).select_from(Account)):
        for data in _SAMPLE_EVENTS:
            db.add(Account(source="seed", **data))
        db.commit()
    # Each seed user is added if missing (by username), not "if the table is
    # empty": a database created before this user existed - or holding only
    # Keycloak users - should still get it.
    existing = set(db.scalars(select(User.username)))
    for data in _SEED_USERS:
        if data["username"] not in existing:
            db.add(User(password_hash=hash_password(DEMO_PASSWORD), provider="demo", **data))
    db.commit()
