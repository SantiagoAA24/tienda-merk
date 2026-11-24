from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.enums import InvoiceStatus, Iva, Unit

NonNegativeMoney = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]
PositiveQuantity = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=3)]
InternalNumber = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)
]
ProductName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
DocType = Literal["cc", "nit", "other"]


class SaleCustomerIn(BaseModel):
    doc_type: DocType
    document: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=20)
    ]
    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
    ]
    email: Annotated[
        str, StringConstraints(strip_whitespace=True, max_length=254)
    ] | None = None


class SaleLineIn(BaseModel):
    product_id: UUID | None = None
    product_name: ProductName
    unit_price: NonNegativeMoney
    quantity: PositiveQuantity
    unit: Unit
    iva: Iva
    line_total: NonNegativeMoney
    position: int = Field(default=0, ge=0)


class SaleCreate(BaseModel):
    id: UUID
    sold_at: datetime
    internal_number: InternalNumber
    subtotal: NonNegativeMoney
    tax: NonNegativeMoney
    total: NonNegativeMoney
    payment_method: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)
    ]
    cash_received: NonNegativeMoney | None = None
    customer: SaleCustomerIn | None = None
    lines: Annotated[list[SaleLineIn], Field(min_length=1)]


class SaleLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID | None
    product_name: str
    unit_price: Decimal
    quantity: Decimal
    unit: Unit
    iva: Iva
    line_total: Decimal
    position: int


class InvoiceSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    number: str | None
    status: InvoiceStatus


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sold_at: datetime
    internal_number: str
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    payment_method: str
    cash_received: Decimal | None
    customer_id: UUID | None
    invoice: InvoiceSummaryOut | None = None


class SaleDetailOut(SaleOut):
    lines: list[SaleLineOut]
