import os

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+pysqlite:///:memory:")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def get_engine() -> Engine:
    return engine
