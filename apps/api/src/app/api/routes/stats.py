from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.stats import StatsSummaryOut, TopProductOut
from app.services import stats as stats_service

router = APIRouter(prefix="/stats", tags=["stats"])

PeriodQuery = Literal["day", "week", "month"]


@router.get("/summary")
def get_summary(
    user: CurrentUser,
    db: DbSession,
    period: Annotated[PeriodQuery, Query()] = "day",
    on: Annotated[date | None, Query()] = None,
) -> StatsSummaryOut:
    return stats_service.get_summary(db, user, period=period, on=on)


@router.get("/top-products")
def get_top_products(
    user: CurrentUser,
    db: DbSession,
    period: Annotated[PeriodQuery, Query()] = "day",
    on: Annotated[date | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 3,
) -> list[TopProductOut]:
    return stats_service.get_top_products(
        db, user, period=period, on=on, limit=limit
    )
