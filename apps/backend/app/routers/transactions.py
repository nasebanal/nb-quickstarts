from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.auth import get_current_username
from app.db import get_db
from app.schemas import TransactionCreate, TransactionOut
from app.services import account_service

# The event log itself - one row per signed-delta event posted against a
# name (see Transaction in models.py). Split from /accounts (the balances
# derived from it, routers/accounts.py) on purpose: a transaction's own id
# and an account's identity (its name) are two different things, and this
# resource's {transaction_id} previously being called "{account_id}" (when
# both lived under /accounts) meant the same path parameter silently meant
# two different things depending which operation you were reading.
router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut])
def list_transactions(db: Session = Depends(get_db)) -> list[TransactionOut]:
    transactions = account_service.list_transactions(db)
    return [TransactionOut.model_validate(transaction) for transaction in transactions]


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    # examples=[1]: the seed data's first row - stable and always present
    # (this table is append-only, nothing ever deletes it) - so contract
    # testers that read OpenAPI examples (e.g. Specmatic) exercise a real
    # id instead of a random one that's guaranteed to 404.
    transaction_id: int = Path(examples=[1]),
    db: Session = Depends(get_db),
) -> TransactionOut:
    transaction = account_service.get_transaction(db, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="transaction not found")
    return TransactionOut.model_validate(transaction)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    username: str = Depends(get_current_username),
) -> TransactionOut:
    transaction = account_service.register_transaction(db, payload, source="api")
    return TransactionOut.model_validate(transaction)
