import re
from collections import deque

from fastapi import HTTPException

from app.schemas import ExpressionIn, ExpressionOut

HISTORY_MAX = 1000
history: deque[ExpressionOut] = deque(maxlen=HISTORY_MAX)

_percent_pair = re.compile(
    r"""
    (?P<a>\d+(?:\.\d+)?)
    \s*(?P<op>[+\-*/])\s*
    (?P<b>\d+(?:\.\d+)?)%
    """,
    re.VERBOSE,
)
_number_percent = re.compile(r"(?P<n>\d+(?:\.\d+)?)%")
_display_operators = str.maketrans({"×": "*", "÷": "/", "−": "-"})


def expand_percent(expression: ExpressionIn) -> str:
    try:
        expanded = expression.expr.translate(_display_operators)
        while match := _percent_pair.search(expanded):
            left, operator, percent = match.group("a", "op", "b")
            if operator in "+-":
                replacement = f"{left} {operator} (({percent}/100)*{left})"
            elif operator == "*":
                replacement = f"{left} * ({percent}/100)"
            else:
                replacement = f"{left} / ({percent}/100)"
            expanded = (
                expanded[: match.start()] + replacement + expanded[match.end() :]
            )

        return _number_percent.sub(
            lambda match: f"({match.group('n')}/100)", expanded
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to expand percentage expression",
        ) from exc


def get_history() -> deque[ExpressionOut]:
    return history
