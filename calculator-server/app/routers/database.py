from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.database import get_engine

router = APIRouter()


@router.get("/test-db")
def test_database_connection(
    engine: Annotated[Engine, Depends(get_engine)],
) -> dict[str, int]:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1")).scalar_one()

    return {"db_result": result}
