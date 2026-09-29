"""Read/write logic for the underlying ledger (the `transactions` table, one
event-sourced table - see `Transaction` in models.py). Exposed at the API
boundary as two separate resources: `/transactions` (the event log itself -
app/routers/transactions.py) and `/accounts` (the balances derived from it -
app/routers/accounts.py); both REST and GraphQL (app/graphql/schema.py) just
call into this one module either way. Kafka events reach this module
indirectly: the kafka-bridge service (kafka/bridge/consumer.py) is a
separate container that consumes the topic and calls POST /transactions
over REST, same as any other client - not an in-process consumer here,
deliberately, so apps/backend has zero Kafka dependency and a Kafka outage
can never affect it. That means every REST-originated transaction currently
gets source="api" regardless of who called it (see routers/transactions.py)
- `source="kafka"` is reserved for a possible future in-process consumer,
not used by kafka-bridge.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Transaction
from app.schemas import AccountBalance, TransactionCreate


def list_transactions(db: Session) -> list[Transaction]:
    return list(db.scalars(select(Transaction).order_by(Transaction.id)))


def get_transaction(db: Session, transaction_id: int) -> Transaction | None:
    return db.get(Transaction, transaction_id)


def register_transaction(db: Session, data: TransactionCreate, source: str = "api") -> Transaction:
    transaction = Transaction(name=data.name, quantity=data.quantity, source=source)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def get_balances(db: Session) -> list[AccountBalance]:
    """One row per distinct name, with `quantity` summed across every event
    for that name - the current "balance" a name's events add up to - plus
    how many events contributed to it."""
    rows = db.execute(
        select(
            Transaction.name,
            func.sum(Transaction.quantity).label("balance"),
            func.count().label("event_count"),
        )
        .group_by(Transaction.name)
        .order_by(Transaction.name)
    )
    return [
        AccountBalance(name=name, balance=balance, event_count=event_count)
        for name, balance, event_count in rows
    ]
