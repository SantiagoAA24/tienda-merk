from sqlalchemy.orm import Session

from app.models import Business, Role, User
from app.security import hash_password

DEFAULT_PASSWORD = "clave-segura-123"


def make_business(db: Session, name: str = "Tienda de prueba") -> Business:
    business = Business(name=name, nit="900000000-0")
    db.add(business)
    db.flush()
    return business


def make_user(
    db: Session,
    business: Business,
    *,
    username: str = "vendedor",
    role: Role = Role.SELLER,
    password: str = DEFAULT_PASSWORD,
    active: bool = True,
) -> User:
    user = User(
        business_id=business.id,
        name=username.capitalize(),
        username=username,
        password_hash=hash_password(password),
        role=role,
        active=active,
    )
    db.add(user)
    db.flush()
    return user
