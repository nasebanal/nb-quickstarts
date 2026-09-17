from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Account(Base):
    """Minimal test-target resource. Event-sourced: each row is one
    quantity-change event (`quantity` is a signed delta, not an absolute
    value). A name's "balance" is the sum of every event's `quantity` for
    that name (`account_service.get_balances` / `GET /accounts/balances`).

    `source` records who registered this event (currently always "api" -
    see account_service.py). `make kafka:bridge-up` runs a separate consumer
    container that calls POST /accounts over REST for each Kafka message, so
    those events land here too, just via the same REST path as everyone
    else - one Kafka message maps naturally onto one row here precisely
    because this table is event-sourced.
    """

    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(16), default="api")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
