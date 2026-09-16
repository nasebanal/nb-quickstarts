import time

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_database(max_attempts: int = 30, retry_wait: float = 2.0) -> None:
    """mysql-server の起動待ち。apps-network 上で backend が mysql-server より先に
    listen し始めることがあるため、接続できるまでリトライする。"""
    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect():
                return
        except Exception as exc:  # noqa: BLE001 - retry on any connection error
            last_exc = exc
            time.sleep(retry_wait)
    raise RuntimeError(f"Could not connect to database after {max_attempts} attempts") from last_exc
