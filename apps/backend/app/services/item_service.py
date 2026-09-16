"""Read/write logic for items.

Both REST (app/routers/items.py) and GraphQL (app/graphql/schema.py) just
call into this module. Kafka events reach this module indirectly: the
kafka-bridge service (kafka/bridge/consumer.py) is a separate container
that consumes the topic and calls POST /items over REST, same as any other
client - not an in-process consumer here, deliberately, so apps/backend
has zero Kafka dependency and a Kafka outage can never affect it. That
means every REST-originated Item currently gets source="api" regardless of
who called it (see routers/items.py) - `source="kafka"` is reserved for a
possible future in-process consumer, not used by kafka-bridge.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Item
from app.schemas import ItemBalance, ItemCreate


def list_items(db: Session) -> list[Item]:
    return list(db.scalars(select(Item).order_by(Item.id)))


def get_item(db: Session, item_id: int) -> Item | None:
    return db.get(Item, item_id)


def register_item(db: Session, data: ItemCreate, source: str = "api") -> Item:
    item = Item(name=data.name, quantity=data.quantity, source=source)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_balances(db: Session) -> list[ItemBalance]:
    """One row per distinct name, with `quantity` summed across every event
    for that name - the current "balance" a name's events add up to - plus
    how many events contributed to it."""
    rows = db.execute(
        select(Item.name, func.sum(Item.quantity).label("balance"), func.count().label("event_count"))
        .group_by(Item.name)
        .order_by(Item.name)
    )
    return [ItemBalance(name=name, balance=balance, event_count=event_count) for name, balance, event_count in rows]
