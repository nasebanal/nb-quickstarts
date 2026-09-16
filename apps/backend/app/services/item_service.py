"""items の読み書きロジック。

REST (app/routers/items.py) と GraphQL (app/graphql/schema.py) はどちらも
ここを呼ぶだけにしてある。将来 Kafka コンシューマーを実装するときも、
イベントを受け取ったら `register_item(db, data, source="kafka")` を直接
呼び出せばよく、HTTP/GraphQL 層に手を入れる必要はない想定。
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Item
from app.schemas import ItemCreate


def list_items(db: Session) -> list[Item]:
    return list(db.scalars(select(Item).order_by(Item.id)))


def get_item(db: Session, item_id: int) -> Item | None:
    return db.get(Item, item_id)


def register_item(db: Session, data: ItemCreate, source: str = "api") -> Item:
    item = Item(name=data.name, quantity=data.quantity, source=source)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
