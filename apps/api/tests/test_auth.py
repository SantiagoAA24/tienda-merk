from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AuthSession, PasswordResetRequest, Role, User
from app.security import create_access_token
from factories import DEFAULT_PASSWORD, make_business, make_user

COOKIE = get_settings().refresh_cookie_name


def login(
    client: TestClient,
    username: str = "vendedor",
    password: str = DEFAULT_PASSWORD,
    keep_session: bool = False,
) -> Response:
    return client.post(
        "/auth/login",
        json={"username": username, "password": password, "keep_session": keep_session},
    )


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def refresh_with(client: TestClient, token: str) -> Response:
    client.cookies.clear()
    return client.post("/auth/refresh", headers={"Cookie": f"{COOKIE}={token}"})


def seller(db: Session, **kwargs: object) -> User:
    return make_user(db, make_business(db), **kwargs)  # type: ignore[arg-type]


def test_login_success_returns_token_user_and_cookie(
    client: TestClient, db: Session
) -> None:
    seller(db)

    response = login(client, username="  Vendedor ")

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 15 * 60
    assert body["user"]["username"] == "vendedor"
    assert body["user"]["role"] == "seller"
    assert "password_hash" not in body["user"]
    set_cookie = response.headers["set-cookie"]
    assert f"{COOKIE}=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "Path=/auth" in set_cookie
    assert "SameSite=strict" in set_cookie
    assert "Max-Age" not in set_cookie
    assert (
        client.get("/auth/me", headers=bearer(body["access_token"])).status_code == 200
    )


def test_keep_session_makes_cookie_persistent(client: TestClient, db: Session) -> None:
    seller(db)

    response = login(client, keep_session=True)

    assert f"Max-Age={30 * 24 * 3600}" in response.headers["set-cookie"]
    session = db.scalars(select(AuthSession)).one()
    assert session.persistent is True


def test_login_wrong_password(client: TestClient, db: Session) -> None:
    seller(db)

    response = login(client, password="incorrecta")

    assert response.status_code == 401
    assert response.json()["detail"] == "Usuario o contraseña incorrectos."
    assert "set-cookie" not in response.headers


def test_login_unknown_user_gets_the_same_answer(client: TestClient) -> None:
    response = login(client, username="nadie")

    assert response.status_code == 401
    assert response.json()["detail"] == "Usuario o contraseña incorrectos."


def test_login_inactive_user(client: TestClient, db: Session) -> None:
    seller(db, active=False)

    assert login(client).status_code == 401


def test_missing_token_is_unauthorized(client: TestClient) -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_expired_access_token_is_unauthorized(client: TestClient, db: Session) -> None:
    user = seller(db)
    login(client)
    session = db.scalars(select(AuthSession)).one()
    expired = create_access_token(
        user.id, session.id, Role.SELLER, now=datetime.now(UTC) - timedelta(minutes=16)
    )

    assert client.get("/auth/me", headers=bearer(expired)).status_code == 401


def test_refresh_rotates_token(client: TestClient, db: Session) -> None:
    seller(db)
    first = login(client).cookies[COOKIE]

    response = refresh_with(client, first)

    assert response.status_code == 200
    second = response.cookies[COOKIE]
    assert second != first
    assert (
        client.get(
            "/auth/me", headers=bearer(response.json()["access_token"])
        ).status_code
        == 200
    )


def test_reusing_rotated_refresh_token_revokes_session(
    client: TestClient, db: Session
) -> None:
    seller(db)
    first = login(client).cookies[COOKIE]
    rotated = refresh_with(client, first)
    access = rotated.json()["access_token"]

    reuse = refresh_with(client, first)

    assert reuse.status_code == 401
    assert f'{COOKIE}=""' in reuse.headers["set-cookie"]
    assert refresh_with(client, rotated.cookies[COOKIE]).status_code == 401
    assert client.get("/auth/me", headers=bearer(access)).status_code == 401


def test_expired_refresh_token_is_unauthorized(client: TestClient, db: Session) -> None:
    seller(db)
    token = login(client).cookies[COOKIE]
    session = db.scalars(select(AuthSession)).one()
    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.flush()

    assert refresh_with(client, token).status_code == 401


def test_refresh_without_cookie_is_unauthorized(client: TestClient) -> None:
    assert client.post("/auth/refresh").status_code == 401


def test_refresh_fails_when_user_was_deactivated(
    client: TestClient, db: Session
) -> None:
    user = seller(db)
    token = login(client).cookies[COOKIE]
    user.active = False
    db.flush()

    assert refresh_with(client, token).status_code == 401


def test_logout_invalidates_access_and_refresh(client: TestClient, db: Session) -> None:
    seller(db)
    response = login(client)
    access = response.json()["access_token"]
    refresh_token = response.cookies[COOKIE]

    logout = client.post("/auth/logout", headers=bearer(access))

    assert logout.status_code == 204
    assert f'{COOKIE}=""' in logout.headers["set-cookie"]
    assert client.get("/auth/me", headers=bearer(access)).status_code == 401
    assert refresh_with(client, refresh_token).status_code == 401


def test_logout_without_session_is_harmless(client: TestClient) -> None:
    assert client.post("/auth/logout").status_code == 204


def test_password_reset_request_is_recorded_for_known_and_unknown_users(
    client: TestClient, db: Session
) -> None:
    user = seller(db)

    known = client.post("/auth/password-reset-requests", json={"username": "Vendedor"})
    unknown = client.post("/auth/password-reset-requests", json={"username": "nadie"})

    assert known.status_code == unknown.status_code == 202
    assert known.content == unknown.content
    requests = db.scalars(
        select(PasswordResetRequest).order_by(PasswordResetRequest.username)
    ).all()
    assert [(r.username, r.user_id) for r in requests] == [
        ("nadie", None),
        ("vendedor", user.id),
    ]
