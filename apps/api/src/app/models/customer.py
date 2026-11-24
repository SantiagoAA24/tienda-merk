import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.types import CreatedAt, UuidPk


class Customer(Base):
    """Consumidor final no crea registro."""

    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("business_id", "document_type", "document_number"),
    )

    id: Mapped[UuidPk]
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id"), index=True
    )
    # TODO(contador): tipos de documento aceptados por el proveedor (CC, NIT, CE...).
    document_type: Mapped[str] = mapped_column(String(10))
    document_number: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(254))
    created_at: Mapped[CreatedAt]
