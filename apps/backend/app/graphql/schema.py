"""GraphQL is a thin layer that just calls the same
app.services.item_service as REST (app/routers/items.py)."""

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


@strawberry.type
class ItemBalanceType:
    name: str
    balance: int
    event_count: int


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

    @strawberry.field
    def balances(self) -> list[ItemBalanceType]:
        with SessionLocal() as db:
            return [
                ItemBalanceType(name=b.name, balance=b.balance, event_count=b.event_count)
                for b in item_service.get_balances(db)
            ]


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
