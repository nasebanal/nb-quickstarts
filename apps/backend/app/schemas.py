from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field
from pydantic.alias_generators import to_camel


def _assume_utc(value: object) -> object:
    """MySQL's DATETIME has no time zone, so SQLAlchemy hands back naive
    datetimes even though `_utc_now` stored UTC - and a naive datetime would
    serialize without an offset, which is not a valid OpenAPI `date-time`
    (RFC 3339 requires one). Everything is stored as UTC, so tag it as such."""
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


UtcDatetime = Annotated[datetime, BeforeValidator(_assume_utc)]


class CamelModel(BaseModel):
    """Base class that serializes to camelCase JSON (for the TypeScript
    frontend / OpenAPI clients) while keeping snake_case attributes on the
    Python side."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TransactionCreate(CamelModel):
    """`quantity` is a signed delta (e.g. -3 to record consumption), not an
    absolute value — see `Transaction` in models.py."""

    # The limits are the columns' own (models.py): a longer name or a bigger number used to reach the database and
    # come back as a 500 - found by ZAP's API scan once it could log in. Now a 422.
    name: str = Field(min_length=1, max_length=128)
    quantity: int = Field(default=0, ge=-2147483648, le=2147483647)


class TransactionOut(CamelModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: int
    name: str
    quantity: int
    source: str
    created_at: UtcDatetime


class AccountBalance(CamelModel):
    """A name's current balance: the sum of every event's `quantity` for
    that name, plus how many events contributed to it (see
    `account_service.get_balances`)."""

    name: str
    balance: int
    event_count: int


class LoginRequest(CamelModel):
    username: str
    password: str


class LoginResponse(CamelModel):
    token: str
    username: str


class JwkKey(CamelModel):
    kty: str
    use: str
    alg: str
    kid: str
    n: str
    e: str


class Jwks(CamelModel):
    keys: list[JwkKey]


class Profile(CamelModel):
    """The current user's profile (`GET /me`). `email` is recorded but not
    editable here: for a Keycloak user it is mirrored from the token, for a
    demo user it comes from the seed data."""

    username: str
    email: str | None = None
    display_name: str | None = None
    language: Literal["ja", "en"]
    provider: Literal["demo", "keycloak"]


class ProfileUpdate(CamelModel):
    """`PUT /me/profile` - only what the user may change."""

    display_name: str | None = Field(default=None, max_length=64)
    language: Literal["ja", "en"] | None = None


class HealthResponse(CamelModel):
    status: str
