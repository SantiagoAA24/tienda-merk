from datetime import date

from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.types import CreatedAt, UuidPk


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[UuidPk]
    name: Mapped[str] = mapped_column(String(120))
    nit: Mapped[str] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(30))
    invoice_provider: Mapped[str | None] = mapped_column(String(40))
    # TODO(contador): datos de la resolución de numeración de la DIAN.
    resolution_number: Mapped[str | None] = mapped_column(String(40))
    resolution_prefix: Mapped[str | None] = mapped_column(String(10))
    resolution_range_from: Mapped[int | None]
    resolution_range_to: Mapped[int | None]
    resolution_valid_from: Mapped[date | None] = mapped_column(Date)
    resolution_valid_to: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[CreatedAt]
