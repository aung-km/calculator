from datetime import datetime

from pydantic import BaseModel


class BaseExpression(BaseModel):
    expr: str


class ExpressionIn(BaseExpression):
    pass


class ExpressionOut(BaseExpression):
    timestamp: datetime
    result: int | float
