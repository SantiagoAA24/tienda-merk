import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.types import CreatedAt, Money, UuidPk


class CashClosing(Base):
    __tablename__ = "cash_closings"
    __table_args__ = (
        UniqueConstraint(
            "business_id",
            "closing_date",
            name="uq_cash_closings_business_date",
        ),
    )

    id: Mapped[UuidPk]
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    closing_date: Mapped[date] = mapped_column(Date, index=True)
    opening_cash: Mapped[Money]
    expected_cash: Mapped[Money]
    counted_cash: Mapped[Money]
    difference: Mapped[Money]
    created_at: Mapped[CreatedAt]
