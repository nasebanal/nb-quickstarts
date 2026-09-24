from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base class that serializes to camelCase JSON (for the TypeScript
    frontend / OpenAPI clients) while keeping snake_case attributes on the
    Python side."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AccountCreate(CamelModel):
    """`quantity` is a signed delta (e.g. -3 to record consumption), not an
    absolute value — see `Account` in models.py."""

    name: str
    quantity: int = 0


class AccountOut(CamelModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: int
    name: str
    quantity: int
    source: str
    created_at: datetime


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
