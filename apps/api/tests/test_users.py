import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuthSession, Business, PasswordResetRequest, Role, User
from factories import DEFAULT_PASSWORD, make_business, make_user


def login_token(
    client: TestClient, username: str, password: str = DEFAULT_PASSWORD
) -> str:
    response = client.post(
        "/auth/login", json={"username": username, "password": password}
    )
    assert response.status_code == 200, response.text
    token: str = response.json()["access_token"]
    return token


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def business(db: Session) -> Business:
    return make_business(db)


@pytest.fixture
def admin(db: Session, business: Business) -> User:
    return make_user(db, business, username="admin", role=Role.ADMIN)


@pytest.fixture
def seller(db: Session, business: Business) -> User:
    return make_user(db, business, username="vendedor", role=Role.SELLER)


@pytest.fixture
def admin_token(client: TestClient, admin: User) -> str:
    return login_token(client, "admin")


def test_admin_lists_only_users_of_their_business(
    client: TestClient, db: Session, admin_token: str, seller: User
) -> None:
    make_user(db, make_business(db, "Otra tienda"), username="ajeno")

    response = client.get("/users", headers=auth(admin_token))

    assert response.status_code == 200
    assert {u["username"] for u in response.json()} == {"admin", "vendedor"}
    assert all("password_hash" not in u for u in response.json())


def test_admin_creates_seller_who_can_log_in(
    client: TestClient, admin_token: str
) -> None:
    response = client.post(
        "/users",
        headers=auth(admin_token),
        json={"name": "Luisa", "username": "Luisa", "password": "nueva-clave-1"},
    )

    assert response.status_code == 201
    assert response.json()["username"] == "luisa"
    assert response.json()["role"] == "seller"
    assert response.json()["active"] is True
    login_token(client, "luisa", "nueva-clave-1")


def test_duplicate_username_is_rejected(
    client: TestClient, admin_token: str, seller: User
) -> None:
    response = client.post(
        "/users",
        headers=auth(admin_token),
        json={"name": "Otro", "username": "vendedor", "password": "nueva-clave-1"},
    )

    assert response.status_code == 409
    assert client.get("/users", headers=auth(admin_token)).status_code == 200


def test_short_password_is_rejected(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/users",
        headers=auth(admin_token),
        json={"name": "Luisa", "username": "luisa", "password": "corta"},
    )

    assert response.status_code == 422


def test_deactivating_user_blocks_login_and_revokes_sessions(
    client: TestClient, db: Session, admin_token: str, seller: User
) -> None:
    seller_token = login_token(client, "vendedor")

    response = client.patch(
        f"/users/{seller.id}", headers=auth(admin_token), json={"active": False}
    )

    assert response.status_code == 200
    assert response.json()["active"] is False
    assert client.get("/auth/me", headers=auth(seller_token)).status_code == 401
    sessions = db.scalars(select(AuthSession).where(AuthSession.user_id == seller.id))
    assert all(s.revoked_at is not None for s in sessions)
    login = client.post(
        "/auth/login", json={"username": "vendedor", "password": DEFAULT_PASSWORD}
    )
    assert login.status_code == 401

    client.patch(
        f"/users/{seller.id}", headers=auth(admin_token), json={"active": True}
    )
    login_token(client, "vendedor")


def test_password_reset_by_admin(
    client: TestClient, db: Session, admin_token: str, seller: User
) -> None:
    old_token = login_token(client, "vendedor")
    client.post("/auth/password-reset-requests", json={"username": "vendedor"})

    response = client.patch(
        f"/users/{seller.id}",
        headers=auth(admin_token),
        json={"password": "clave-nueva-456"},
    )

    assert response.status_code == 200
    assert client.get("/auth/me", headers=auth(old_token)).status_code == 401
    old = client.post(
        "/auth/login", json={"username": "vendedor", "password": DEFAULT_PASSWORD}
    )
    assert old.status_code == 401
    login_token(client, "vendedor", "clave-nueva-456")
    request = db.scalars(select(PasswordResetRequest)).one()
    assert request.resolved_at is not None


def test_role_change_applies_immediately(
    client: TestClient, admin_token: str, seller: User
) -> None:
    seller_token = login_token(client, "vendedor")
    assert client.get("/users", headers=auth(seller_token)).status_code == 403

    client.patch(
        f"/users/{seller.id}", headers=auth(admin_token), json={"role": "admin"}
    )

    assert client.get("/users", headers=auth(seller_token)).status_code == 200


@pytest.mark.parametrize("change", [{"active": False}, {"role": "seller"}])
def test_admin_cannot_lock_themselves_out(
    client: TestClient, admin: User, admin_token: str, change: dict[str, object]
) -> None:
    response = client.patch(
        f"/users/{admin.id}", headers=auth(admin_token), json=change
    )

    assert response.status_code == 409


def test_admin_cannot_edit_users_of_another_business(
    client: TestClient, db: Session, admin_token: str
) -> None:
    other = make_user(db, make_business(db, "Otra tienda"), username="ajeno")

    response = client.patch(
        f"/users/{other.id}", headers=auth(admin_token), json={"active": False}
    )

    assert response.status_code == 404


def test_unknown_user_is_not_found(client: TestClient, admin_token: str) -> None:
    response = client.patch(
        f"/users/{uuid.uuid4()}", headers=auth(admin_token), json={"name": "X"}
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    ("method", "path", "json"),
    [
        ("GET", "/users", None),
        ("POST", "/users", {"name": "X", "username": "xxx", "password": "clave-123-x"}),
        ("PATCH", "/users/{id}", {"active": False}),
    ],
)
def test_seller_is_forbidden(
    client: TestClient,
    admin: User,
    seller: User,
    method: str,
    path: str,
    json: dict[str, object] | None,
) -> None:
    token = login_token(client, "vendedor")

    response = client.request(
        method, path.format(id=admin.id), headers=auth(token), json=json
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "No tienes permiso para hacer esto."


@pytest.mark.parametrize(
    ("method", "path"),
    [("GET", "/users"), ("POST", "/users"), ("PATCH", f"/users/{uuid.uuid4()}")],
)
def test_anonymous_is_unauthorized(client: TestClient, method: str, path: str) -> None:
    response = client.request(method, path, json={})

    assert response.status_code == 401
