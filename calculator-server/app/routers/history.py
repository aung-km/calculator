from collections import deque
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_history
from app.schemas import ExpressionOut

router = APIRouter()


@router.get("/history")
def read_history(
    history: Annotated[deque[ExpressionOut], Depends(get_history)],
    limit: Annotated[int, Query(ge=0)] = 50,
) -> list[ExpressionOut]:
    return list(history)[:limit]


@router.delete("/history")
def clear_history(
    history: Annotated[deque[ExpressionOut], Depends(get_history)],
):
    history.clear()
    return {"ok": True, "cleared": True}
