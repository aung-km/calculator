import math
from collections import deque
from datetime import datetime
from typing import Annotated

from asteval import Interpreter
from fastapi import APIRouter, Depends

from app.dependencies import expand_percent, get_history
from app.schemas import ExpressionIn, ExpressionOut

router = APIRouter()
aeval = Interpreter(minimal=True, usersyms={"pi": math.pi, "e": math.e})


@router.post("/calculate")
def calculate(
    expression: ExpressionIn,
    expanded_expression: Annotated[str, Depends(expand_percent)],
    history: Annotated[deque[ExpressionOut], Depends(get_history)],
):
    try:
        result = aeval(expanded_expression)
        if aeval.error:
            message = "; ".join(str(error.get_error()) for error in aeval.error)
            aeval.error.clear()
            return {
                "ok": False,
                "expr": expression.expr,
                "result": "",
                "error": message,
            }

        history.appendleft(
            ExpressionOut(
                timestamp=datetime.now(),
                expr=expression.expr,
                result=result,
            )
        )
        return {
            "ok": True,
            "expr": expression.expr,
            "result": result,
            "error": "",
        }
    except Exception as exc:
        aeval.error.clear()
        return {"ok": False, "expr": expression.expr, "error": str(exc)}
