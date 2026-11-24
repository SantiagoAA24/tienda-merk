import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import InvoiceStatus
from app.models.types import CreatedAt, UuidPk, str_enum

if TYPE_CHECKING:
    from app.models.sale import Sale


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (UniqueConstraint("business_id", "number"),)

    id: Mapped[UuidPk]
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id"))
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id"), unique=True)
    # Assigned by the server on sync (e.g. FE-0232), never by the phone.
    number: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[InvoiceStatus] = mapped_column(
        str_enum(InvoiceStatus, "invoice_status"),
        default=InvoiceStatus.PENDING,
        index=True,
    )
    cufe: Mapped[str | None] = mapped_column(String(128))
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    pdf_url: Mapped[str | None] = mapped_column(String(500))
    xml_url: Mapped[str | None] = mapped_column(String(500))
    attempts: Mapped[int] = mapped_column(default=0, server_default="0")
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    sale: Mapped["Sale"] = relationship(back_populates="invoice")
