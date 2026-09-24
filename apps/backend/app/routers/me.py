from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import Principal, get_current_principal
from app.db import get_db
from app.models import User
from app.schemas import Profile, ProfileUpdate

router = APIRouter(prefix="/me", tags=["me"])


def _load_user(db: Session, principal: Principal) -> User:
    """The caller's `users` row, created on first use if there isn't one yet -
    the case for a Keycloak user (their identity lives in Keycloak, so nothing
    seeded them here) and for a demo token that predates the users table."""
    user = db.scalar(select(User).where(User.username == principal.username))
    if user is None:
        user = User(username=principal.username, provider=principal.provider, language="en")
        db.add(user)
    if principal.provider == "keycloak":
        # Mirrored from the token, not editable here: Keycloak is the source
        # of truth for who this is.
        user.provider = "keycloak"
        if principal.email:
            user.email = principal.email
        if principal.name and not user.display_name:
            user.display_name = principal.name
    db.commit()
    db.refresh(user)
    return user


def _profile(user: User) -> Profile:
    return Profile(
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        language=user.language if user.language in ("ja", "en") else "en",
        provider=user.provider if user.provider in ("demo", "keycloak") else "demo",
    )


@router.get("", response_model=Profile)
def get_me(principal: Principal = Depends(get_current_principal), db: Session = Depends(get_db)) -> Profile:
    return _profile(_load_user(db, principal))


@router.put("/profile", response_model=Profile)
def update_profile(
    payload: ProfileUpdate,
    principal: Principal = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> Profile:
    user = _load_user(db, principal)
    # Only the fields that were sent change; email is not among them.
    if payload.display_name is not None:
        user.display_name = payload.display_name.strip() or None
    if payload.language is not None:
        user.language = payload.language
    db.commit()
    db.refresh(user)
    return _profile(user)
