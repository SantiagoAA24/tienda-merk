import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.types import CreatedAt, Timestamp, UuidPk


class AuthSession(Base):
    """One row per login; the refresh token rotates inside the same session."""

    __tablename__ = "auth_sessions"

    id: Mapped[UuidPk]
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    # Kept after rotation: if it shows up again the token was stolen.
    previous_token_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    persistent: Mapped[bool]
    expires_at: Mapped[Timestamp]
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[CreatedAt]
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"

    id: Mapped[UuidPk]
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    username: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[CreatedAt]
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
