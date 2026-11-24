from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.db import check_connection

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    database: str


@router.get("/health")
def health() -> JSONResponse:
    db_up = check_connection()
    payload = HealthResponse(
        status="ok" if db_up else "degraded",
        database="up" if db_up else "down",
    )
    return JSONResponse(
        status_code=200 if db_up else 503,
        content=payload.model_dump(),
    )
