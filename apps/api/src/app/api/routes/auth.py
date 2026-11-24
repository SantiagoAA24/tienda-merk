from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.config import get_settings
from app.models import AuthSession, PasswordResetRequest, User
from app.schemas.auth import LoginRequest, PasswordResetRequestIn, TokenResponse
from app.schemas.user import UserOut
from app.security import InvalidTokenError, create_access_token, decode_access_token
from app.services.auth import (
    RefreshError,
    authenticate,
    revoke_by_refresh_token,
    revoke_session,
    rotate_session,
    session_lifetime,
    start_session,
)

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS = "Usuario o contraseña incorrectos."
SESSION_ENDED = "Tu sesión terminó. Vuelve a iniciar sesión."

RefreshCookie = Annotated[str | None, Cookie(alias=get_settings().refresh_cookie_name)]


def _set_refresh_cookie(response: Response, token: str, session: AuthSession) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        max_age=(
            int(session_lifetime(True).total_seconds()) if session.persistent else None
        ),
        path=settings.refresh_cookie_path,
        httponly=True,
        secure=bool(settings.cookie_secure),
        samesite="strict",
    )


def _clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=settings.refresh_cookie_path,
        httponly=True,
        secure=bool(settings.cookie_secure),
        samesite="strict",
    )


def _token_response(user: User, session: AuthSession) -> TokenResponse:
    settings = get_settings()
    return TokenResponse(
        access_token=create_access_token(user.id, session.id, user.role),
        expires_in=settings.access_token_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/login")
def login(body: LoginRequest, response: Response, db: DbSession) -> TokenResponse:
    user = authenticate(db, body.username, body.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)
    session, refresh_token = start_session(db, user, persistent=body.keep_session)
    db.commit()
    _set_refresh_cookie(response, refresh_token, session)
    return _token_response(user, session)


def _session_ended() -> HTTPException:
    cleared = Response()
    _clear_refresh_cookie(cleared)
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail=SESSION_ENDED,
        headers={"set-cookie": cleared.headers["set-cookie"]},
    )


@router.post("/refresh")
def refresh(
    response: Response, db: DbSession, refresh_cookie: RefreshCookie = None
) -> TokenResponse:
    if not refresh_cookie:
        raise _session_ended()
    try:
        session, user, new_token = rotate_session(db, refresh_cookie)
    except RefreshError as exc:
        raise _session_ended() from exc
    db.commit()
    _set_refresh_cookie(response, new_token, session)
    return _token_response(user, session)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: DbSession,
    refresh_cookie: RefreshCookie = None,
) -> None:
    if refresh_cookie:
        revoke_by_refresh_token(db, refresh_cookie)
    scheme, token = get_authorization_scheme_param(request.headers.get("Authorization"))
    if scheme.lower() == "bearer" and token:
        try:
            revoke_session(db, decode_access_token(token).session_id)
        except InvalidTokenError:
            pass
    db.commit()
    _clear_refresh_cookie(response)


@router.get("/me")
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/password-reset-requests", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(body: PasswordResetRequestIn, db: DbSession) -> None:
    username = body.username.strip().lower()
    user = db.scalars(select(User).where(User.username == username)).one_or_none()
    db.add(PasswordResetRequest(user_id=user.id if user else None, username=username))
    db.commit()
