from datetime import datetime

import pytest
from fastapi import HTTPException

from app.dependencies import HISTORY_MAX, expand_percent, get_history
from app.schemas import BaseExpression, ExpressionIn, ExpressionOut


def expanded(expr: str) -> str:
    return expand_percent(ExpressionIn(expr=expr))


def test_add_percent():
    assert expanded("5 + 10%") == "5 + ((10/100)*5)"


def test_subtract_percent():
    assert expanded("20 - 30%") == "20 - ((30/100)*20)"


def test_multiply_percent():
    assert expanded("15 * 25%") == "15 * (25/100)"


def test_divide_percent():
    assert expanded("40 / 50%") == "40 / (50/100)"


def test_multiple_operations():
    assert expanded("3 * 4% + 2 / 1%") == "3 * (4/100) + 2 / (1/100)"


def test_standalone_100_percent():
    assert expanded("100%") == "(100/100)"


def test_two_standalone_percents():
    assert expanded("10% + 20%") == "(10/100) + (20/100)"


def test_expression_models_share_base_fields():
    assert issubclass(ExpressionIn, BaseExpression)
    assert issubclass(ExpressionOut, BaseExpression)

    output = ExpressionOut(
        expr="2 + 2",
        timestamp=datetime(2026, 9, 25, 12, 0),
        result=4,
    )

    assert output.expr == "2 + 2"
    assert output.result == 4


def test_expand_percent_converts_unexpected_errors_to_http_400():
    invalid_expression = ExpressionIn.model_construct(expr=None)

    with pytest.raises(HTTPException) as exc_info:
        expand_percent(invalid_expression)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Unable to expand percentage expression"


def test_get_history_returns_the_shared_bounded_deque():
    first = get_history()
    second = get_history()

    first.clear()

    assert first is second
    assert first.maxlen == HISTORY_MAX == 1000
