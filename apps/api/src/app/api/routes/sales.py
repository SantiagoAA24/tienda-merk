import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.models.enums import InvoiceStatus
from app.schemas.sale import SaleCreate, SaleDetailOut, SaleOut
from app.services import sales as sales_service

router = APIRouter(prefix="/sales", tags=["sales"])


def _serialize(sale: object) -> SaleDetailOut:
    return SaleDetailOut.model_validate(sale)


@router.post("")
def create_sale(
    body: SaleCreate,
    user: CurrentUser,
    db: DbSession,
    response: Response,
) -> SaleDetailOut:
    sale, created = sales_service.create_sale_idempotent(db, user, body)
    response.status_code = (
        status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )
    return _serialize(sale)


@router.get("")
def list_sales(
    user: CurrentUser,
    db: DbSession,
    from_date: Annotated[date | None, Query(alias="from")] = None,
    to_date: Annotated[date | None, Query(alias="to")] = None,
    invoice_status: Annotated[
        InvoiceStatus | None, Query(alias="status")
    ] = None,
) -> list[SaleOut]:
    rows = sales_service.list_sales(
        db,
        user,
        from_date=from_date,
        to_date=to_date,
        invoice_status=invoice_status,
    )
    return [SaleOut.model_validate(row) for row in rows]


@router.get("/{sale_id}")
def get_sale(
    sale_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> SaleDetailOut:
    sale = sales_service.get_owned_sale(db, sale_id, user)
    return _serialize(sale)
