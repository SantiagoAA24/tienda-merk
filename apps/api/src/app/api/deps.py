from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Role, User
from app.security import AccessClaims, InvalidTokenError, decode_access_token
from app.services.auth import is_session_active

DbSession = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Tu sesión terminó. Vuelve a iniciar sesión.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_access_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> AccessClaims:
    if credentials is None:
        raise _unauthorized()
    try:
        return decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise _unauthorized() from exc


def get_current_user(
    claims: Annotated[AccessClaims, Depends(get_access_claims)], db: DbSession
) -> User:
    user = db.get(User, claims.user_id)
    if (
        user is None
        or not user.active
        or not is_session_active(db, claims.session_id, user.id)
    ):
        raise _unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: Role) -> Callable[[User], User]:
    """Role comes from the database, so a role change applies immediately."""

    def dependency(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para hacer esto.",
            )
        return user

    return dependency


AdminUser = Annotated[User, Depends(require_roles(Role.ADMIN))]
