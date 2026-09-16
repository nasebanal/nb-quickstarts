from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Item(Base):
    """テスト対象の最小リソース。

    `source` は誰がこのレコードを登録したかを示す (api / kafka)。まだ Kafka
    コンシューマーは実装していないが、将来 make kafka:start のイベント連携から
    `services.item_service.register_item(..., source="kafka")` を直接呼び出す
    想定で用意してある。
    """

    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String(16), default="api")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now)
