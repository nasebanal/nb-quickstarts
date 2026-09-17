"""GraphQL is a thin layer that just calls the same
app.services.account_service as REST (app/routers/accounts.py)."""

import strawberry
from strawberry.fastapi import GraphQLRouter

from app.db import SessionLocal
from app.schemas import AccountCreate
from app.services import account_service


@strawberry.type
class AccountType:
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
class AccountInput:
    name: str
    quantity: int = 0


def _to_graphql_type(account) -> AccountType:
    return AccountType(id=account.id, name=account.name, quantity=account.quantity, source=account.source)


@strawberry.type
class Query:
    @strawberry.field
    def accounts(self) -> list[AccountType]:
        with SessionLocal() as db:
            return [_to_graphql_type(account) for account in account_service.list_accounts(db)]

    @strawberry.field
    def balances(self) -> list[AccountBalanceType]:
        with SessionLocal() as db:
            return [
                AccountBalanceType(name=b.name, balance=b.balance, event_count=b.event_count)
                for b in account_service.get_balances(db)
            ]


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_account(self, input: AccountInput) -> AccountType:
        data = AccountCreate(name=input.name, quantity=input.quantity)
        with SessionLocal() as db:
            account = account_service.register_account(db, data, source="api")
            return _to_graphql_type(account)


schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_router = GraphQLRouter(schema)
