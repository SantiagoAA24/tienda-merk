from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.closing import ClosingCreate, ClosingOut
from app.services import closings as closings_service

router = APIRouter(prefix="/closings", tags=["closings"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_closing(
    body: ClosingCreate,
    user: CurrentUser,
    db: DbSession,
) -> ClosingOut:
    row = closings_service.create_closing(db, user, body)
    return ClosingOut.model_validate(row)
