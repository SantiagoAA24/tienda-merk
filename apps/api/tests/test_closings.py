import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Business, CashClosing, PriceType, Role, Unit, User
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
def seller(db: Session, business: Business) -> User:
    return make_user(db, business, username="vendedor", role=Role.SELLER)


@pytest.fixture
def seller_token(client: TestClient, seller: User) -> str:
    return login_token(client, "vendedor")


def sale_payload(
    *,
    internal_number: str,
    sold_at: str,
    total: str,
    payment_method: str,
    product_id: uuid.UUID,
) -> dict[str, object]:
    return {
        "id": str(uuid.uuid4()),
        "sold_at": sold_at,
        "internal_number": internal_number,
        "subtotal": total,
        "tax": "0",
        "total": total,
        "payment_method": payment_method,
        "cash_received": total if payment_method == "cash" else None,
        "customer": None,
        "lines": [
            {
                "product_id": str(product_id),
                "product_name": "Producto",
                "unit_price": total,
                "quantity": "1.000",
                "unit": "und",
                "iva": "excluido",
                "line_total": total,
                "position": 0,
            }
        ],
    }


def test_create_closing_computes_expected_and_difference(
    client: TestClient,
    db: Session,
    business: Business,
    seller_token: str,
) -> None:
    product = make_product(
        db, business, unit=Unit.UNIT, price_type=PriceType.FIXED
    )
    cash = client.post(
        "/sales",
        json=sale_payload(
            internal_number="V-0001",
            sold_at="2026-11-21T12:00:00-05:00",
            total="121300",
            payment_method="cash",
            product_id=product.id,
        ),
        headers=auth(seller_token),
    )
    assert cash.status_code == 201, cash.text
    transfer = client.post(
        "/sales",
        json=sale_payload(
            internal_number="V-0002",
            sold_at="2026-11-21T13:00:00-05:00",
            total="41900",
            payment_method="transfer",
            product_id=product.id,
        ),
        headers=auth(seller_token),
    )
    assert transfer.status_code == 201, transfer.text

    response = client.post(
        "/closings",
        json={
            "closing_date": "2026-11-21",
            "opening_cash": "50000",
            "counted_cash": "171300",
        },
        headers=auth(seller_token),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["opening_cash"] == "50000.00"
    # expected = 50000 + 121300 cash sales
    assert body["expected_cash"] == "171300.00"
    assert body["counted_cash"] == "171300.00"
    assert body["difference"] == "0.00"
    assert Decimal(body["difference"]) == Decimal("0")

    stored = db.scalars(select(CashClosing)).one()
    assert stored.closing_date.isoformat() == "2026-11-21"


def test_closing_duplicate_returns_409(
    client: TestClient,
    db: Session,
    business: Business,
    seller_token: str,
) -> None:
    del db, business
    first = client.post(
        "/closings",
        json={
            "closing_date": "2026-11-21",
            "opening_cash": "50000",
            "counted_cash": "50000",
        },
        headers=auth(seller_token),
    )
    assert first.status_code == 201, first.text

    second = client.post(
        "/closings",
        json={
            "closing_date": "2026-11-21",
            "opening_cash": "50000",
            "counted_cash": "51000",
        },
        headers=auth(seller_token),
    )
    assert second.status_code == 409
    assert "cierre" in second.json()["detail"].lower()


def test_closing_requires_auth(client: TestClient) -> None:
    assert (
        client.post(
            "/closings",
            json={
                "closing_date": "2026-11-21",
                "opening_cash": "0",
                "counted_cash": "0",
            },
        ).status_code
        == 401
    )
