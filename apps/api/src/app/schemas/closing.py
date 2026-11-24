from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

NonNegativeMoney = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]


class ClosingCreate(BaseModel):
    closing_date: date
    opening_cash: NonNegativeMoney
    counted_cash: NonNegativeMoney


class ClosingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    closing_date: date
    opening_cash: Decimal
    expected_cash: Decimal
    counted_cash: Decimal
    difference: Decimal
    created_at: datetime
