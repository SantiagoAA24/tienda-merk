import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.api.deps import AdminUser, DbSession
from app.models import PasswordResetRequest, Role, User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.security import hash_password
from app.services.auth import revoke_user_sessions

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(admin: AdminUser, db: DbSession) -> list[UserOut]:
    users = db.scalars(
        select(User).where(User.business_id == admin.business_id).order_by(User.name)
    ).all()
    return [UserOut.model_validate(user) for user in users]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, admin: AdminUser, db: DbSession) -> UserOut:
    user = User(
        business_id=admin.business_id,
        name=body.name,
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    try:
        with db.begin_nested():
            db.add(user)
    except IntegrityError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="Ese usuario ya existe. Elige otro."
        ) from exc
    db.commit()
    return UserOut.model_validate(user)


@router.patch("/{user_id}")
def update_user(
    user_id: uuid.UUID, body: UserUpdate, admin: AdminUser, db: DbSession
) -> UserOut:
    user = db.get(User, user_id)
    if user is None or user.business_id != admin.business_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    if user.id == admin.id and (
        body.active is False or (body.role is not None and body.role != Role.ADMIN)
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="No puedes desactivarte ni quitarte el rol de administrador.",
        )

    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.active is not None:
        user.active = body.active
    if body.password is not None:
        user.password_hash = hash_password(body.password)
        db.execute(
            update(PasswordResetRequest)
            .where(
                PasswordResetRequest.user_id == user.id,
                PasswordResetRequest.resolved_at.is_(None),
            )
            .values(resolved_at=datetime.now(UTC))
        )

    if body.active is False or body.password is not None:
        revoke_user_sessions(db, user.id)

    db.commit()
    return UserOut.model_validate(user)
