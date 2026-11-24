import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import Role
from app.models.types import CreatedAt, UuidPk, str_enum


class User(Base):
    __tablename__ = "users"

    id: Mapped[UuidPk]
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(str_enum(Role, "role"))
    active: Mapped[bool] = mapped_column(default=True, server_default=true())
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
