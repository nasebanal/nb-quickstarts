"""GraphQL is a thin layer that just calls the same
app.services.account_service as REST (app/routers/transactions.py,
app/routers/accounts.py) - same split as REST's own /transactions
(the event log) vs /accounts (the balances derived from it)."""

import strawberry
from fastapi import Depends
from strawberry.fastapi import GraphQLRouter

from app.auth import get_current_username
from app.db import SessionLocal
from app.schemas import TransactionCreate
from app.services import account_service


@strawberry.type
class TransactionType:
    id: int
    name: str
    quantity: int
    source: str


@strawberry.type
class AccountBalanceType:
    name: str
    balance: int
    event_count: int


@strawberry.input
class TransactionInput:
    name: str
    quantity: int = 0


def _to_graphql_type(transaction) -> TransactionType:
    return TransactionType(id=transaction.id, name=transaction.name, quantity=transaction.quantity, source=transaction.source)


@strawberry.type
class Query:
    @strawberry.field
    def transactions(self) -> list[TransactionType]:
        with SessionLocal() as db:
            return [_to_graphql_type(transaction) for transaction in account_service.list_transactions(db)]

    @strawberry.field
    def accounts(self) -> list[AccountBalanceType]:
        with SessionLocal() as db:
            return [
                AccountBalanceType(name=b.name, balance=b.balance, event_count=b.event_count)
                for b in account_service.get_balances(db)
            ]


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_transaction(self, input: TransactionInput) -> TransactionType:
        data = TransactionCreate(name=input.name, quantity=input.quantity)
        with SessionLocal() as db:
            transaction = account_service.register_transaction(db, data, source="api")
            return _to_graphql_type(transaction)


schema = strawberry.Schema(query=Query, mutation=Mutation)
# Like the REST routes, GraphQL needs a valid access token (so the GraphiQL page in a browser answers 401 too).
graphql_router = GraphQLRouter(schema, dependencies=[Depends(get_current_username)])
