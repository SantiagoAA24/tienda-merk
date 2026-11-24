import uuid
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from app.models.enums import Role

MIN_PASSWORD_LENGTH = 8


def _normalize_username(value: str) -> str:
    return value.strip().lower()


Username = Annotated[
    str,
    StringConstraints(min_length=3, max_length=50, pattern=r"^\s*[A-Za-z0-9._-]+\s*$"),
    AfterValidator(_normalize_username),
]
Password = Annotated[str, Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)]
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    username: str
    role: Role
    active: bool


class UserCreate(BaseModel):
    name: Name
    username: Username
    password: Password
    role: Role = Role.SELLER


class UserUpdate(BaseModel):
    name: Name | None = None
    role: Role | None = None
    active: bool | None = None
    password: Password | None = None
