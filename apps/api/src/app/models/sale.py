import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import Iva, Unit
from app.models.types import MONEY, CreatedAt, Money, Quantity, UuidPk, str_enum

if TYPE_CHECKING:
    from app.models.invoice import Invoice


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint("business_id", "internal_number"),
        CheckConstraint("total >= 0", name="total_non_negative"),
    )

    # Generated on the phone; the server never assigns it (idempotent retries).
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    customer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("customers.id"))
    sold_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    internal_number: Mapped[str] = mapped_column(String(30))
    subtotal: Mapped[Money]
    tax: Mapped[Money]
    total: Mapped[Money]
    payment_method: Mapped[str] = mapped_column(String(30))
    cash_received: Mapped[Decimal | None] = mapped_column(MONEY)
    created_at: Mapped[CreatedAt]

    lines: Mapped[list["SaleLine"]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan",
        order_by="SaleLine.position",
    )
    invoice: Mapped["Invoice | None"] = relationship(back_populates="sale")


class SaleLine(Base):
    """Name and price are frozen copies: editing a product never alters past sales."""

    __tablename__ = "sale_lines"
    __table_args__ = (CheckConstraint("quantity > 0", name="quantity_positive"),)

    id: Mapped[UuidPk]
    sale_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL")
    )
    position: Mapped[int] = mapped_column(default=0)
    product_name: Mapped[str] = mapped_column(String(120))
    unit_price: Mapped[Money]
    quantity: Mapped[Quantity]
    unit: Mapped[Unit] = mapped_column(str_enum(Unit, "unit"))
    iva: Mapped[Iva] = mapped_column(str_enum(Iva, "iva"))
    line_total: Mapped[Money]

    sale: Mapped[Sale] = relationship(back_populates="lines")
