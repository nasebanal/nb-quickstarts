"""GraphQL は REST (app/routers/items.py) と同じ app.services.item_service
を呼ぶだけの薄いレイヤー。"""

import strawberry
from strawberry.fastapi import GraphQLRouter

from app.db import SessionLocal
from app.schemas import ItemCreate
from app.services import item_service


@strawberry.type
class ItemType:
    id: int
    name: str
    quantity: int
    source: str


@strawberry.input
class ItemInput:
    name: str
    quantity: int = 0


def _to_graphql_type(item) -> ItemType:
    return ItemType(id=item.id, name=item.name, quantity=item.quantity, source=item.source)


@strawberry.type
class Query:
    @strawberry.field
    def items(self) -> list[ItemType]:
        with SessionLocal() as db:
            return [_to_graphql_type(item) for item in item_service.list_items(db)]


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_item(self, input: ItemInput) -> ItemType:
        data = ItemCreate(name=input.name, quantity=input.quantity)
        with SessionLocal() as db:
            item = item_service.register_item(db, data, source="api")
            return _to_graphql_type(item)


schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_router = GraphQLRouter(schema)
