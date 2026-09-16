from fastapi import APIRouter, HTTPException, status

from app.auth import issue_token
from app.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if not payload.employee_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="employeeCode is required")
    token = issue_token(payload.employee_code)
    return LoginResponse(token=token, employee_code=payload.employee_code)
