from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_employee_code
from app.db import get_db
from app.schemas import AccountBalance, AccountCreate, AccountOut
from app.services import account_service

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)) -> list[AccountOut]:
    accounts = account_service.list_accounts(db)
    return [AccountOut.model_validate(account) for account in accounts]


# Must be declared before GET /{account_id} - otherwise FastAPI would try to
# match "balances" as an account_id (an int) and fail with a 422 instead of
# reaching this route.
@router.get("/balances", response_model=list[AccountBalance])
def list_balances(db: Session = Depends(get_db)) -> list[AccountBalance]:
    return account_service.get_balances(db)


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: Session = Depends(get_db)) -> AccountOut:
    account = account_service.get_account(db, account_id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account not found")
    return AccountOut.model_validate(account)


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    employee_code: str = Depends(get_current_employee_code),
) -> AccountOut:
    account = account_service.register_account(db, payload, source="api")
    return AccountOut.model_validate(account)
