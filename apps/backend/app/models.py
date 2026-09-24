from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, UniqueConstraint
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


class User(Base):
    """A person who can use the app: their login (for the demo login) and their
    profile. Rows come from the seed data (`app/seed.py`) - the initial demo
    users - and are also created on first use for users who log in through
    Keycloak, whose identity lives in Keycloak (`provider` = "keycloak", no
    `password_hash`, `email` mirrored from the token and not editable here).

    Deliberately not linked to `Account`: an account event is a ledger entry,
    not owned by a user.
    """

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("username", name="uq_users_username"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64))
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    language: Mapped[str] = mapped_column(String(8), default="en")
    provider: Mapped[str] = mapped_column(String(16), default="demo")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, onupdate=_utc_now)
