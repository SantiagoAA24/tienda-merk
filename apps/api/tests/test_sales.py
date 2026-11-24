import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Business, Invoice, InvoiceStatus, Outbox, Role, Sale, User
from app.schemas.sale import SaleCreate, SaleLineIn
from app.services import sales as sales_service
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
    sold_at: str = "2026-11-21T19:42:00+00:00",
    product_id: uuid.UUID | None = None,
    total: str = "8000",
) -> dict[str, object]:
    return {
        "id": str(sale_id or uuid.uuid4()),
        "sold_at": sold_at,
        "internal_number": internal_number,
        "subtotal": total,
        "tax": "0",
        "total": total,
        "payment_method": "cash",
        "cash_received": "10000",
        "customer": None,
        "lines": [
            {
                "product_id": str(product_id) if product_id else None,
                "product_name": "Papa pastusa",
                "unit_price": "3200",
                "quantity": "2.500",
                "unit": "kg",
                "iva": "excluido",
                "line_total": total,
                "position": 0,
            }
        ],
    }


def test_unauthenticated_sales_are_rejected(client: TestClient) -> None:
    assert client.get("/sales").status_code == 401
    assert client.post("/sales", json=sale_payload()).status_code == 401


def test_post_sale_is_idempotent_by_uuid(
    client: TestClient,
    db: Session,
    business: Business,
    seller_token: str,
) -> None:
    product = make_product(db, business)
    payload = sale_payload(product_id=product.id)

    first = client.post("/sales", json=payload, headers=auth(seller_token))
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["id"] == payload["id"]
    assert body["invoice"]["status"] == "pending"
    assert body["invoice"]["number"] == "FE-0001"
    assert len(body["lines"]) == 1

    second = client.post("/sales", json=payload, headers=auth(seller_token))
    assert second.status_code == 200, second.text
    assert second.json()["id"] == payload["id"]
    assert second.json()["invoice"]["number"] == "FE-0001"

    assert db.scalar(select(func.count()).select_from(Sale)) == 1
    assert db.scalar(select(func.count()).select_from(Invoice)) == 1
    assert db.scalar(select(func.count()).select_from(Outbox)) == 1
    outbox = db.scalars(select(Outbox)).one()
    assert outbox.kind == "emit_invoice"
    assert outbox.payload == {"sale_id": payload["id"]}


def test_list_sales_filters_by_date_and_status(
    client: TestClient,
    db: Session,
    business: Business,
    seller: User,
    seller_token: str,
) -> None:
    product = make_product(db, business)
    early = sale_payload(
        sale_id=uuid.uuid4(),
        internal_number="V-0001",
        sold_at="2026-11-10T12:00:00+00:00",
        product_id=product.id,
        total="1000",
    )
    mid = sale_payload(
        sale_id=uuid.uuid4(),
        internal_number="V-0002",
        sold_at="2026-11-15T12:00:00+00:00",
        product_id=product.id,
        total="2000",
    )
    late = sale_payload(
        sale_id=uuid.uuid4(),
        internal_number="V-0003",
        sold_at="2026-11-20T12:00:00+00:00",
        product_id=product.id,
        total="3000",
    )
    for payload in (early, mid, late):
        resp = client.post("/sales", json=payload, headers=auth(seller_token))
        assert resp.status_code == 201, resp.text

    mid_sale = db.get(Sale, uuid.UUID(str(mid["id"])))
    assert mid_sale is not None and mid_sale.invoice is not None
    mid_sale.invoice.status = InvoiceStatus.ACCEPTED
    db.flush()

    by_range = client.get(
        "/sales",
        params={"from": "2026-11-12", "to": "2026-11-18"},
        headers=auth(seller_token),
    )
    assert by_range.status_code == 200
    assert [row["id"] for row in by_range.json()] == [mid["id"]]

    by_status = client.get(
        "/sales",
        params={"status": "accepted"},
        headers=auth(seller_token),
    )
    assert by_status.status_code == 200
    assert [row["id"] for row in by_status.json()] == [mid["id"]]

    pending = client.get(
        "/sales",
        params={"status": "pending"},
        headers=auth(seller_token),
    )
    assert pending.status_code == 200
    assert {row["id"] for row in pending.json()} == {early["id"], late["id"]}

    # Other business never appears.
    other = make_business(db, "Otra")
    other_user = make_user(db, other, username="otro")
    other_sale = Sale(
        id=uuid.uuid4(),
        business_id=other.id,
        user_id=other_user.id,
        sold_at=datetime(2026, 11, 15, 12, 0, tzinfo=UTC),
        internal_number="V-0001",
        subtotal=Decimal("500"),
        tax=Decimal("0"),
        total=Decimal("500"),
        payment_method="cash",
    )
    db.add(other_sale)
    db.flush()
    all_mine = client.get("/sales", headers=auth(seller_token))
    assert {row["id"] for row in all_mine.json()} == {
        early["id"],
        mid["id"],
        late["id"],
    }


def test_get_sale_by_id_and_cross_tenant_404(
    client: TestClient,
    db: Session,
    business: Business,
    seller_token: str,
) -> None:
    product = make_product(db, business)
    payload = sale_payload(product_id=product.id)
    created = client.post("/sales", json=payload, headers=auth(seller_token))
    assert created.status_code == 201

    detail = client.get(f"/sales/{payload['id']}", headers=auth(seller_token))
    assert detail.status_code == 200
    assert detail.json()["lines"][0]["product_name"] == "Papa pastusa"

    other = make_business(db, "Otra")
    make_user(db, other, username="ajeno")
    other_token = login_token(client, "ajeno")
    missing = client.get(f"/sales/{payload['id']}", headers=auth(other_token))
    assert missing.status_code == 404


def test_create_rolls_back_when_outbox_fails(
    db: Session,
    business: Business,
    seller: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    product = make_product(db, business)
    sale_id = uuid.uuid4()
    body = SaleCreate(
        id=sale_id,
        sold_at=datetime(2026, 11, 21, 19, 42, tzinfo=UTC),
        internal_number="V-0099",
        subtotal=Decimal("8000"),
        tax=Decimal("0"),
        total=Decimal("8000"),
        payment_method="cash",
        cash_received=Decimal("10000"),
        lines=[
            SaleLineIn(
                product_id=product.id,
                product_name=product.name,
                unit_price=Decimal("3200"),
                quantity=Decimal("2.5"),
                unit=product.unit,
                iva=product.iva,
                line_total=Decimal("8000"),
            )
        ],
    )

    def boom(*_args: object, **_kwargs: object) -> None:
        raise RuntimeError("outbox down")

    monkeypatch.setattr(sales_service, "enqueue_emit_invoice", boom)

    with pytest.raises(RuntimeError, match="outbox down"):
        sales_service.create_sale_idempotent(db, seller, body)

    db.expire_all()
    assert db.get(Sale, sale_id) is None
    assert db.scalar(select(func.count()).select_from(Invoice)) == 0
    assert db.scalar(select(func.count()).select_from(Outbox)) == 0
