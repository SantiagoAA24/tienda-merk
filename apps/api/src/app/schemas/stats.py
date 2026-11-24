from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

Period = Literal["day", "week", "month"]


class DailyTotalOut(BaseModel):
    date: date
    label: str
    total: Decimal
    sale_count: int


class StatsSummaryOut(BaseModel):
    period: Period
    from_date: date
    to_date: date
    total: Decimal
    sale_count: int
    average_ticket: Decimal
    previous_total: Decimal
    invoices_accepted: int
    invoices_total: int
    daily: list[DailyTotalOut] = Field(default_factory=list)


class TopProductOut(BaseModel):
    rank: int
    product_name: str
    quantity: Decimal
    unit: str
    total: Decimal
