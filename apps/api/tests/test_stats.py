import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Business, InvoiceStatus, Role, Sale, User
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
    sale_id: uuid.UUID | None = None,
    internal_number: str = "V-0001",
    sold_at: str,
    product_id: uuid.UUID | None = None,
    product_name: str = "Papa pastusa",
    total: str = "8000",
    quantity: str = "2.500",
    unit: str = "kg",
    payment_method: str = "cash",
) -> dict[str, object]:
    return {
        "id": str(sale_id or uuid.uuid4()),
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
                "product_id": str(product_id) if product_id else None,
                "product_name": product_name,
                "unit_price": "3200",
                "quantity": quantity,
                "unit": unit,
                "iva": "excluido",
                "line_total": total,
                "position": 0,
            }
        ],
    }


def test_stats_summary_and_top_products(
    client: TestClient,
    db: Session,
    business: Business,
    seller_token: str,
) -> None:
    product = make_product(db, business)
    # Saturday 2026-11-21 in Bogota = 2026-11-21T05:00:00Z for noon-ish;
    # use explicit -05:00 so the calendar day is unambiguous.
    today = client.post(
        "/sales",
        json=sale_payload(
            internal_number="V-0001",
            sold_at="2026-11-21T15:00:00-05:00",
            product_id=product.id,
            product_name="Papa pastusa",
            total="10000",
            quantity="3.000",
        ),
        headers=auth(seller_token),
    )
    assert today.status_code == 201, today.text
    yesterday = client.post(
        "/sales",
        json=sale_payload(
            internal_number="V-0002",
            sold_at="2026-11-20T15:00:00-05:00",
            product_id=product.id,
            product_name="Arroz",
            total="5000",
            quantity="2.000",
            unit="lb",
        ),
        headers=auth(seller_token),
    )
    assert yesterday.status_code == 201, yesterday.text

    sale = db.get(Sale, uuid.UUID(today.json()["id"]))
    assert sale is not None and sale.invoice is not None
    sale.invoice.status = InvoiceStatus.ACCEPTED
    db.flush()

    summary = client.get(
        "/stats/summary",
        params={"period": "day", "on": "2026-11-21"},
        headers=auth(seller_token),
    )
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["total"] == "10000.00"
    assert body["sale_count"] == 1
    assert body["average_ticket"] == "10000"
    assert body["previous_total"] == "5000.00"
    assert body["invoices_accepted"] == 1
    assert body["invoices_total"] == 1

    week = client.get(
        "/stats/summary",
        params={"period": "week", "on": "2026-11-21"},
        headers=auth(seller_token),
    )
    assert week.status_code == 200, week.text
    week_body = week.json()
    assert week_body["sale_count"] == 2
    assert len(week_body["daily"]) == 7
    assert week_body["daily"][0]["label"] == "L"

    top = client.get(
        "/stats/top-products",
        params={"period": "day", "on": "2026-11-21", "limit": 3},
        headers=auth(seller_token),
    )
    assert top.status_code == 200, top.text
    items = top.json()
    assert len(items) == 1
    assert items[0]["product_name"] == "Papa pastusa"
    assert items[0]["rank"] == 1
    assert items[0]["total"] == "10000.00"


def test_stats_require_auth(client: TestClient) -> None:
    assert client.get("/stats/summary").status_code == 401
    assert client.get("/stats/top-products").status_code == 401


def test_stats_scoped_to_business(
    client: TestClient,
    db: Session,
    business: Business,
    seller_token: str,
) -> None:
    product = make_product(db, business)
    mine = client.post(
        "/sales",
        json=sale_payload(
            sold_at="2026-11-21T12:00:00-05:00",
            product_id=product.id,
            total="1000",
        ),
        headers=auth(seller_token),
    )
    assert mine.status_code == 201

    other = make_business(db, "Otra")
    other_user = make_user(db, other, username="ajeno", role=Role.SELLER)
    other_product = make_product(db, other, name="Otro")
    other_token = login_token(client, "ajeno")
    foreign = client.post(
        "/sales",
        json=sale_payload(
            sold_at="2026-11-21T12:00:00-05:00",
            product_id=other_product.id,
            total="9999",
            product_name="Otro",
        ),
        headers=auth(other_token),
    )
    assert foreign.status_code == 201

    summary = client.get(
        "/stats/summary",
        params={"period": "day", "on": "2026-11-21"},
        headers=auth(seller_token),
    )
    assert summary.json()["total"] == "1000.00"
    assert other_user.id is not None
