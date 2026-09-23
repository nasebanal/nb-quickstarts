from fastapi import APIRouter, HTTPException, status

from app.auth import issue_token
from app.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if not payload.username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="username is required")
    token = issue_token(payload.username)
    return LoginResponse(token=token, username=payload.username)
