from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """JSON は camelCase (TypeScript フロントエンド/OpenAPI クライアント向け)、
    Python 側の属性は snake_case のままにする共通基底クラス。"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ItemCreate(CamelModel):
    name: str
    quantity: int = 0


class ItemOut(CamelModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: int
    name: str
    quantity: int
    source: str
    created_at: datetime


class LoginRequest(CamelModel):
    employee_code: str


class LoginResponse(CamelModel):
    token: str
    employee_code: str


class HealthResponse(CamelModel):
    status: str
