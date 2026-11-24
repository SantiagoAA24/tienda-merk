import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, StatementError
from sqlalchemy.orm import Session

from app.models import (
    Business,
    CashClosing,
    Customer,
    Invoice,
    InvoiceStatus,
    Iva,
    Outbox,
    OutboxStatus,
    Role,
    Sale,
    SaleLine,
    Unit,
)
from factories import make_business, make_product, make_user


def make_sale(
    db: Session, business: Business, user_id: uuid.UUID, number: str = "M-0001"
) -> Sale:
    sale = Sale(
        id=uuid.uuid4(),
        business_id=business.id,
        user_id=user_id,
        sold_at=datetime(2026, 11, 21, 19, 42, tzinfo=UTC),
        internal_number=number,
        subtotal=Decimal("8000"),
        tax=Decimal("0"),
        total=Decimal("8000"),
        payment_method="cash",
        cash_received=Decimal("10000"),
    )
    db.add(sale)
    db.flush()
    return sale


def test_full_sale_graph_is_persisted(db: Session) -> None:
    business = make_business(db)
    admin = make_user(db, business, username="admin", role=Role.ADMIN)
    product = make_product(db, business)
    customer = Customer(
        business_id=business.id,
        document_type="CC",
        document_number="1020304050",
        name="Ana Pérez",
        email="ana@example.com",
    )
    db.add(customer)
    db.flush()

    sale_id = uuid.uuid4()
    sale = Sale(
        id=sale_id,
        business_id=business.id,
        user_id=admin.id,
        customer_id=customer.id,
        sold_at=datetime(2026, 11, 21, 19, 42, tzinfo=UTC),
        internal_number="M-0001",
        subtotal=Decimal("8000"),
        tax=Decimal("0"),
        total=Decimal("8000"),
        payment_method="cash",
        cash_received=Decimal("10000"),
        lines=[
            SaleLine(
                product_id=product.id,
                product_name=product.name,
                unit_price=product.price,
                quantity=Decimal("2.5"),
                unit=Unit.KILOGRAM,
                iva=Iva.EXCLUDED,
                line_total=Decimal("8000"),
            )
        ],
    )
    db.add(sale)
    db.add(Invoice(business_id=business.id, sale_id=sale_id, number="FE-0232"))
    db.add(Outbox(kind="emit_invoice", payload={"sale_id": str(sale_id)}))
    db.add(
        CashClosing(
            business_id=business.id,
            user_id=admin.id,
            closing_date=date(2026, 11, 21),
            opening_cash=Decimal("50000"),
            expected_cash=Decimal("184500"),
            counted_cash=Decimal("184000"),
            difference=Decimal("-500"),
        )
    )
    db.flush()
    db.expire_all()

    stored = db.get(Sale, sale_id)
    assert stored is not None
    assert stored.id == sale_id
    assert [line.quantity for line in stored.lines] == [Decimal("2.500")]
    invoice = db.scalars(select(Invoice).where(Invoice.sale_id == sale_id)).one()
    assert invoice.status is InvoiceStatus.PENDING
    assert invoice.attempts == 0
    outbox = db.scalars(select(Outbox)).one()
    assert outbox.status is OutboxStatus.PENDING
    assert outbox.payload == {"sale_id": str(sale_id)}


def test_decimal_quantities_and_money_are_exact(db: Session) -> None:
    business = make_business(db)
    user = make_user(db, business)
    sale = make_sale(db, business, user.id)
    for position, quantity in enumerate(["2.5", "0.125", "1.333"]):
        sale.lines.append(
            SaleLine(
                position=position,
                product_name="Tomate",
                unit_price=Decimal("4500.00"),
                quantity=Decimal(quantity),
                unit=Unit.KILOGRAM,
                iva=Iva.EXCLUDED,
                line_total=Decimal("0.10") + Decimal("0.20"),
            )
        )
    db.flush()
    db.expire_all()

    rows = db.execute(
        text("SELECT quantity, line_total FROM sale_lines ORDER BY position")
    ).all()
    assert [row.quantity for row in rows] == [
        Decimal("2.500"),
        Decimal("0.125"),
        Decimal("1.333"),
    ]
    assert all(row.line_total == Decimal("0.30") for row in rows)


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
def test_sale_uuid_comes_from_the_client(db: Session) -> None:
    business = make_business(db)
    user = make_user(db, business)
    with pytest.raises(IntegrityError):
        db.add(
            Sale(
                business_id=business.id,
                user_id=user.id,
                sold_at=datetime.now(UTC),
                internal_number="M-0002",
                subtotal=Decimal("0"),
                tax=Decimal("0"),
                total=Decimal("0"),
                payment_method="cash",
            )
        )
        db.flush()


def test_same_sale_uuid_is_not_duplicated(db: Session) -> None:
    business = make_business(db)
    user = make_user(db, business)
    sale = make_sale(db, business, user.id)
    db.expunge(sale)
    with pytest.raises(IntegrityError):
        db.execute(
            text(
                "INSERT INTO sales (id, business_id, user_id, sold_at,"
                " internal_number, subtotal, tax, total, payment_method)"
                " VALUES (:id, :b, :u, now(), 'M-9999', 0, 0, 0, 'cash')"
            ),
            {"id": sale.id, "b": business.id, "u": user.id},
        )


def test_line_keeps_frozen_name_and_price(db: Session) -> None:
    business = make_business(db)
    user = make_user(db, business)
    product = make_product(db, business, name="Arroz", price=Decimal("2800"))
    sale = make_sale(db, business, user.id)
    sale.lines.append(
        SaleLine(
            product_id=product.id,
            product_name=product.name,
            unit_price=product.price,
            quantity=Decimal("22"),
            unit=Unit.POUND,
            iva=Iva.EXCLUDED,
            line_total=Decimal("61600"),
        )
    )
    db.flush()

    product.name = "Arroz Diana"
    product.price = Decimal("3100")
    db.flush()
    db.expire_all()

    line = db.scalars(select(SaleLine)).one()
    assert line.product_name == "Arroz"
    assert line.unit_price == Decimal("2800.00")


def test_username_is_unique(db: Session) -> None:
    business = make_business(db)
    make_user(db, business, username="merk")
    with pytest.raises(IntegrityError):
        make_user(db, business, username="merk")


def test_invoice_number_is_unique_per_business(db: Session) -> None:
    business = make_business(db)
    user = make_user(db, business)
    first = make_sale(db, business, user.id, "M-0001")
    second = make_sale(db, business, user.id, "M-0002")
    db.add(Invoice(business_id=business.id, sale_id=first.id, number="FE-0001"))
    db.flush()
    with pytest.raises(IntegrityError):
        db.add(Invoice(business_id=business.id, sale_id=second.id, number="FE-0001"))
        db.flush()


def test_enum_values_are_checked_in_the_database(db: Session) -> None:
    business = make_business(db)
    with pytest.raises(IntegrityError):
        db.execute(
            text(
                "INSERT INTO products (id, business_id, name, price_type, price,"
                " unit, iva) VALUES (gen_random_uuid(), :b, 'X', 'fixed', 1,"
                " 'und', '16')"
            ),
            {"b": business.id},
        )


def test_enum_values_are_checked_in_python(db: Session) -> None:
    business = make_business(db)
    with pytest.raises(StatementError):
        make_product(db, business, unit="litro")


def test_quantity_must_be_positive(db: Session) -> None:
    business = make_business(db)
    user = make_user(db, business)
    sale = make_sale(db, business, user.id)
    sale.lines.append(
        SaleLine(
            product_name="Huevo",
            unit_price=Decimal("600"),
            quantity=Decimal("0"),
            unit=Unit.UNIT,
            iva=Iva.EXCLUDED,
            line_total=Decimal("0"),
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()
