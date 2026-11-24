import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Annotated

from sqlalchemy import DateTime, Enum, Numeric, Uuid, func
from sqlalchemy.orm import mapped_column

MONEY = Numeric(14, 2)
QUANTITY = Numeric(12, 3)

UuidPk = Annotated[uuid.UUID, mapped_column(Uuid, primary_key=True, default=uuid.uuid4)]
Money = Annotated[Decimal, mapped_column(MONEY)]
Quantity = Annotated[Decimal, mapped_column(QUANTITY)]
Timestamp = Annotated[datetime, mapped_column(DateTime(timezone=True))]
CreatedAt = Annotated[
    datetime,
    mapped_column(DateTime(timezone=True), server_default=func.now()),
]


def str_enum(enum_cls: type[StrEnum], name: str) -> Enum:
    """Stored as VARCHAR + CHECK so new values don't need ALTER TYPE."""
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda members: [m.value for m in members],
        validate_strings=True,
    )
