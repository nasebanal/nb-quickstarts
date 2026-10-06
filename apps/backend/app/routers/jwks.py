from fastapi import APIRouter

from app.jwt_tokens import jwks
from app.schemas import Jwks

router = APIRouter(tags=["auth"])


@router.get("/.well-known/jwks.json", response_model=Jwks)
def get_jwks() -> dict:
    """The public key that verifies this backend's access tokens, as a JWKS."""
    return jwks()
