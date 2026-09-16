from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_employee_code
from app.db import get_db
from app.schemas import ItemBalance, ItemCreate, ItemOut
from app.services import item_service

router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=list[ItemOut])
def list_items(db: Session = Depends(get_db)) -> list[ItemOut]:
    items = item_service.list_items(db)
    return [ItemOut.model_validate(item) for item in items]


# Must be declared before GET /{item_id} - otherwise FastAPI would try to
# match "balances" as an item_id (an int) and fail with a 422 instead of
# reaching this route.
@router.get("/balances", response_model=list[ItemBalance])
def list_balances(db: Session = Depends(get_db)) -> list[ItemBalance]:
    return item_service.get_balances(db)


@router.get("/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)) -> ItemOut:
    item = item_service.get_item(db, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="item not found")
    return ItemOut.model_validate(item)


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    employee_code: str = Depends(get_current_employee_code),
) -> ItemOut:
    item = item_service.register_item(db, payload, source="api")
    return ItemOut.model_validate(item)
