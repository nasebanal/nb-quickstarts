from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import AccountBalance
from app.services import account_service

# An account - one distinct name and its current balance, the running total
# of every transaction posted against it (routers/transactions.py) - is a
# read model derived from the transaction log, not a separately created
# entity: there's no POST here, an account with no prior transactions is
# implicitly created by its first one (see Account in models.py). Split
# from the transaction log itself on purpose: the same event-sourced idea
# Chris Richardson's Event Sourcing / CQRS patterns describe (the write
# side is the immutable log; this is a read-side projection over it), just
# without a separate datastore or event store for it - both still come from
# the one `accounts` table (account_service.py).
router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountBalance])
def list_accounts(db: Session = Depends(get_db)) -> list[AccountBalance]:
    return account_service.get_balances(db)
