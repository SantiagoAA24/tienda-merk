import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import Iva, PriceType, Unit
from app.models.types import MONEY, CreatedAt, Money, UuidPk, str_enum


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="price_non_negative"),
        CheckConstraint("cost IS NULL OR cost >= 0", name="cost_non_negative"),
    )

    id: Mapped[UuidPk]
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    price_type: Mapped[PriceType] = mapped_column(str_enum(PriceType, "price_type"))
    price: Mapped[Money]
    unit: Mapped[Unit] = mapped_column(str_enum(Unit, "unit"))
    iva: Mapped[Iva] = mapped_column(str_enum(Iva, "iva"))
    cost: Mapped[Decimal | None] = mapped_column(MONEY)
    active: Mapped[bool] = mapped_column(default=True, server_default=true())
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
