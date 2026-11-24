"""Sale registration: idempotent create with pending invoice + outbox."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Business,
    Customer,
    Invoice,
    InvoiceStatus,
    Outbox,
    Sale,
    SaleLine,
    User,
)
from app.schemas.sale import SaleCreate, SaleCustomerIn
from app.timeutil import day_bounds

DOC_TYPE_MAP = {"cc": "CC", "nit": "NIT", "other": "OTHER"}


def _load_sale(db: Session, sale_id: uuid.UUID) -> Sale | None:
    return db.scalars(
        select(Sale)
        .where(Sale.id == sale_id)
        .options(
            selectinload(Sale.lines),
            selectinload(Sale.invoice),
        )
    ).first()


def get_owned_sale(db: Session, sale_id: uuid.UUID, user: User) -> Sale:
    sale = _load_sale(db, sale_id)
    if sale is None or sale.business_id != user.business_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venta no encontrada.",
        )
    return sale


def list_sales(
    db: Session,
    user: User,
    *,
    from_date: date | None = None,
    to_date: date | None = None,
    invoice_status: InvoiceStatus | None = None,
) -> list[Sale]:
    stmt = (
        select(Sale)
        .where(Sale.business_id == user.business_id)
        .options(
            selectinload(Sale.lines),
            selectinload(Sale.invoice),
        )
        .order_by(Sale.sold_at.desc())
    )
    if from_date is not None:
        start, _ = day_bounds(from_date)
        stmt = stmt.where(Sale.sold_at >= start)
    if to_date is not None:
        _, end = day_bounds(to_date)
        stmt = stmt.where(Sale.sold_at < end)
    if invoice_status is not None:
        stmt = stmt.join(Invoice).where(
            Invoice.business_id == user.business_id,
            Invoice.status == invoice_status,
        )
    return list(db.scalars(stmt).unique().all())


def _find_or_create_customer(
    db: Session, business_id: uuid.UUID, customer: SaleCustomerIn
) -> Customer:
    document_type = DOC_TYPE_MAP[customer.doc_type]
    existing = db.scalars(
        select(Customer).where(
            Customer.business_id == business_id,
            Customer.document_type == document_type,
            Customer.document_number == customer.document,
        )
    ).first()
    if existing is not None:
        existing.name = customer.name
        if customer.email:
            existing.email = customer.email
        return existing

    row = Customer(
        business_id=business_id,
        document_type=document_type,
        document_number=customer.document,
        name=customer.name,
        email=customer.email or None,
    )
    db.add(row)
    db.flush()
    return row


def next_invoice_number(db: Session, business: Business) -> str:
    # TODO(contador): validar prefijo, rango y vigencia de la resolución DIAN.
    prefix = (business.resolution_prefix or "FE").strip() or "FE"
    like_pattern = f"{prefix}-%"
    numbers = db.scalars(
        select(Invoice.number).where(
            Invoice.business_id == business.id,
            Invoice.number.is_not(None),
            Invoice.number.like(like_pattern),
        )
    ).all()
    max_seq = 0
    for number in numbers:
        if number is None:
            continue
        suffix = number.removeprefix(f"{prefix}-")
        if suffix.isdigit():
            max_seq = max(max_seq, int(suffix))
    next_seq = max_seq + 1
    if business.resolution_range_from is not None:
        next_seq = max(next_seq, business.resolution_range_from)
    if (
        business.resolution_range_to is not None
        and next_seq > business.resolution_range_to
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Se agotó el rango de numeración de facturas. Revisa la resolución.",
        )
    return f"{prefix}-{next_seq:04d}"


def enqueue_emit_invoice(db: Session, sale_id: uuid.UUID) -> Outbox:
    """Creates the outbox row; tests may patch this to fail mid-transaction."""
    task = Outbox(kind="emit_invoice", payload={"sale_id": str(sale_id)})
    db.add(task)
    db.flush()
    return task


def create_sale_idempotent(
    db: Session, user: User, body: SaleCreate
) -> tuple[Sale, bool]:
    """Returns (sale, created). Repeating the same UUID never duplicates rows."""
    existing = _load_sale(db, body.id)
    if existing is not None:
        if existing.business_id != user.business_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Venta no encontrada.",
            )
        return existing, False

    business = db.get(Business, user.business_id)
    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Negocio no encontrado.",
        )

    try:
        with db.begin_nested():
            customer_id: uuid.UUID | None = None
            if body.customer is not None:
                customer_id = _find_or_create_customer(
                    db, user.business_id, body.customer
                ).id

            sale = Sale(
                id=body.id,
                business_id=user.business_id,
                user_id=user.id,
                customer_id=customer_id,
                sold_at=body.sold_at,
                internal_number=body.internal_number,
                subtotal=body.subtotal,
                tax=body.tax,
                total=body.total,
                payment_method=body.payment_method,
                cash_received=body.cash_received,
                lines=[
                    SaleLine(
                        product_id=line.product_id,
                        product_name=line.product_name,
                        unit_price=line.unit_price,
                        quantity=line.quantity,
                        unit=line.unit,
                        iva=line.iva,
                        line_total=line.line_total,
                        position=line.position if line.position else index,
                    )
                    for index, line in enumerate(body.lines)
                ],
            )
            db.add(sale)
            db.flush()

            invoice_number = next_invoice_number(db, business)
            db.add(
                Invoice(
                    business_id=user.business_id,
                    sale_id=sale.id,
                    number=invoice_number,
                    status=InvoiceStatus.PENDING,
                )
            )
            db.flush()
            enqueue_emit_invoice(db, sale.id)
    except IntegrityError as exc:
        conflict = _load_sale(db, body.id)
        if conflict is not None and conflict.business_id == user.business_id:
            return conflict, False
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo guardar la venta: conflicto de numeración o datos.",
        ) from exc

    db.commit()
    loaded = _load_sale(db, body.id)
    assert loaded is not None
    return loaded, True
