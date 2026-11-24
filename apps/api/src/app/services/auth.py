import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AuthSession, User
from app.security import (
    burn_password_check,
    hash_password,
    hash_refresh_token,
    needs_rehash,
    new_refresh_token,
    verify_password,
)


class RefreshError(Exception):
    pass


def _now() -> datetime:
    return datetime.now(UTC)


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = db.scalars(
        select(User).where(User.username == username.strip().lower())
    ).one_or_none()
    if user is None:
        burn_password_check(password)
        return None
    if not verify_password(user.password_hash, password) or not user.active:
        return None
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    return user


def session_lifetime(persistent: bool) -> timedelta:
    settings = get_settings()
    if persistent:
        return timedelta(days=settings.refresh_persistent_days)
    return timedelta(hours=settings.refresh_session_hours)


def start_session(
    db: Session, user: User, *, persistent: bool
) -> tuple[AuthSession, str]:
    token = new_refresh_token()
    now = _now()
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_refresh_token(token),
        persistent=persistent,
        expires_at=now + session_lifetime(persistent),
        last_used_at=now,
    )
    db.add(session)
    db.flush()
    return session, token


def rotate_session(db: Session, token: str) -> tuple[AuthSession, User, str]:
    token_hash = hash_refresh_token(token)
    session = db.scalars(
        select(AuthSession).where(AuthSession.token_hash == token_hash)
    ).one_or_none()
    now = _now()

    if session is None:
        reused = db.scalars(
            select(AuthSession).where(AuthSession.previous_token_hash == token_hash)
        ).one_or_none()
        if reused is not None and reused.revoked_at is None:
            reused.revoked_at = now
            db.commit()
        raise RefreshError("token desconocido")

    if session.revoked_at is not None or session.expires_at <= now:
        raise RefreshError("sesión vencida")

    user = db.get(User, session.user_id)
    if user is None or not user.active:
        session.revoked_at = now
        db.commit()
        raise RefreshError("usuario inactivo")

    new_token = new_refresh_token()
    session.previous_token_hash = token_hash
    session.token_hash = hash_refresh_token(new_token)
    session.last_used_at = now
    db.flush()
    return session, user, new_token


def revoke_by_refresh_token(db: Session, token: str) -> None:
    db.execute(
        update(AuthSession)
        .where(
            AuthSession.token_hash == hash_refresh_token(token),
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=_now())
    )


def revoke_session(db: Session, session_id: uuid.UUID) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.id == session_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=_now())
    )


def revoke_user_sessions(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=_now())
    )


def is_session_active(db: Session, session_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    session = db.get(AuthSession, session_id)
    return (
        session is not None
        and session.user_id == user_id
        and session.revoked_at is None
        and session.expires_at > _now()
    )
