from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Business, Iva, PriceType, Role, Unit, User
from factories import DEFAULT_PASSWORD, make_business, make_product, make_user


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


@pytest.fixture
def seller_token(client: TestClient, seller: User) -> str:
    return login_token(client, "vendedor")


def test_unauthenticated_request_is_rejected(client: TestClient) -> None:
    assert client.get("/products").status_code == 401
    assert (
        client.post(
            "/products",
            json={
                "name": "Arroz",
                "price_type": "fixed",
                "price": "1000",
                "iva": "excluido",
            },
        ).status_code
        == 401
    )


def test_lists_active_products_filtered_by_price_type(
    client: TestClient, db: Session, business: Business, admin_token: str
) -> None:
    make_product(
        db,
        business,
        name="Papa",
        price_type=PriceType.WEIGHT,
        unit=Unit.KILOGRAM,
        price=Decimal("3200"),
    )
    make_product(
        db,
        business,
        name="Huevos",
        price_type=PriceType.FIXED,
        unit=Unit.UNIT,
        price=Decimal("600"),
    )
    make_product(
        db,
        business,
        name="Viejo",
        price_type=PriceType.FIXED,
        unit=Unit.UNIT,
        price=Decimal("100"),
        active=False,
    )
    other = make_business(db, "Otra")
    make_product(db, other, name="Ajeno", unit=Unit.UNIT, price_type=PriceType.FIXED)

    all_resp = client.get("/products", headers=auth(admin_token))
    assert all_resp.status_code == 200
    assert [p["name"] for p in all_resp.json()] == ["Huevos", "Papa"]

    weight = client.get("/products?price_type=weight", headers=auth(admin_token))
    assert [p["name"] for p in weight.json()] == ["Papa"]

    fixed = client.get("/products?price_type=fixed", headers=auth(admin_token))
    assert [p["name"] for p in fixed.json()] == ["Huevos"]


def test_admin_sees_cost_seller_does_not(
    client: TestClient,
    db: Session,
    business: Business,
    admin_token: str,
    seller_token: str,
) -> None:
    make_product(
        db,
        business,
        name="Arroz",
        cost=Decimal("2500"),
        unit=Unit.POUND,
    )

    admin_resp = client.get("/products", headers=auth(admin_token))
    assert admin_resp.status_code == 200
    assert admin_resp.json()[0]["cost"] == "2500.00"

    seller_resp = client.get("/products", headers=auth(seller_token))
    assert seller_resp.status_code == 200
    assert "cost" not in seller_resp.json()[0]


def test_admin_creates_weight_and_fixed_products(
    client: TestClient, admin_token: str
) -> None:
    weight = client.post(
        "/products",
        headers=auth(admin_token),
        json={
            "name": "Papa criolla",
            "price_type": "weight",
            "price": "4500",
            "unit": "kg",
            "iva": "excluido",
            "cost": "3000",
        },
    )
    assert weight.status_code == 201, weight.text
    body = weight.json()
    assert body["unit"] == "kg"
    assert body["cost"] == "3000.00"

    fixed = client.post(
        "/products",
        headers=auth(admin_token),
        json={
            "name": "Huevos AA",
            "price_type": "fixed",
            "price": "600",
            "iva": "exento",
        },
    )
    assert fixed.status_code == 201, fixed.text
    assert fixed.json()["unit"] == "und"
    assert fixed.json()["cost"] is None


def test_weight_without_weight_unit_is_rejected(
    client: TestClient, admin_token: str
) -> None:
    missing = client.post(
        "/products",
        headers=auth(admin_token),
        json={
            "name": "Papa",
            "price_type": "weight",
            "price": "4500",
            "iva": "excluido",
        },
    )
    assert missing.status_code == 422

    wrong = client.post(
        "/products",
        headers=auth(admin_token),
        json={
            "name": "Papa",
            "price_type": "weight",
            "price": "4500",
            "unit": "und",
            "iva": "excluido",
        },
    )
    assert wrong.status_code == 422


def test_fixed_rejects_non_unit_and_invalid_iva(
    client: TestClient, admin_token: str
) -> None:
    unit = client.post(
        "/products",
        headers=auth(admin_token),
        json={
            "name": "Panela",
            "price_type": "fixed",
            "price": "2900",
            "unit": "kg",
            "iva": "excluido",
        },
    )
    assert unit.status_code == 422

    iva = client.post(
        "/products",
        headers=auth(admin_token),
        json={
            "name": "Panela",
            "price_type": "fixed",
            "price": "2900",
            "iva": "8",
        },
    )
    assert iva.status_code == 422


def test_seller_cannot_set_cost_on_create_or_update(
    client: TestClient,
    db: Session,
    business: Business,
    seller_token: str,
) -> None:
    create = client.post(
        "/products",
        headers=auth(seller_token),
        json={
            "name": "Leche",
            "price_type": "fixed",
            "price": "3400",
            "iva": "excluido",
            "cost": "2000",
        },
    )
    assert create.status_code == 403

    product = make_product(
        db,
        business,
        name="Leche",
        price_type=PriceType.FIXED,
        unit=Unit.UNIT,
        cost=Decimal("2000"),
    )
    update = client.patch(
        f"/products/{product.id}",
        headers=auth(seller_token),
        json={"cost": "1500"},
    )
    assert update.status_code == 403


def test_seller_can_create_without_cost(
    client: TestClient, seller_token: str
) -> None:
    response = client.post(
        "/products",
        headers=auth(seller_token),
        json={
            "name": "Panela",
            "price_type": "fixed",
            "price": "2900",
            "iva": "excluido",
        },
    )
    assert response.status_code == 201, response.text
    assert "cost" not in response.json()


def test_patch_updates_fields_and_deactivate_hides_from_list(
    client: TestClient,
    db: Session,
    business: Business,
    admin_token: str,
) -> None:
    product = make_product(
        db,
        business,
        name="Papa",
        price_type=PriceType.WEIGHT,
        unit=Unit.KILOGRAM,
        iva=Iva.EXCLUDED,
        cost=Decimal("2000"),
    )

    updated = client.patch(
        f"/products/{product.id}",
        headers=auth(admin_token),
        json={
            "name": "Papa pastusa",
            "price": "3300",
            "unit": "lb",
            "iva": "5",
            "cost": "2100",
        },
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["name"] == "Papa pastusa"
    assert body["price"] == "3300.00"
    assert body["unit"] == "lb"
    assert body["iva"] == "5"
    assert body["cost"] == "2100.00"

    deactivated = client.patch(
        f"/products/{product.id}",
        headers=auth(admin_token),
        json={"active": False},
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["active"] is False

    listed = client.get("/products", headers=auth(admin_token))
    assert listed.json() == []


def test_patch_other_business_is_not_found(
    client: TestClient, db: Session, admin_token: str
) -> None:
    other = make_business(db, "Otra")
    product = make_product(db, other)
    response = client.patch(
        f"/products/{product.id}",
        headers=auth(admin_token),
        json={"name": "Hack"},
    )
    assert response.status_code == 404
