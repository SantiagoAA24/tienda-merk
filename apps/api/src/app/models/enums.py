from enum import StrEnum


class Role(StrEnum):
    ADMIN = "admin"
    SELLER = "seller"


class PriceType(StrEnum):
    FIXED = "fixed"
    WEIGHT = "weight"


class Unit(StrEnum):
    UNIT = "und"
    GRAM = "g"
    KILOGRAM = "kg"
    POUND = "lb"


class Iva(StrEnum):
    """TODO(contador): confirmar las categorías de IVA que aplican a la tienda."""

    EXCLUDED = "excluido"
    EXEMPT = "exento"
    RATE_5 = "5"
    RATE_19 = "19"


class InvoiceStatus(StrEnum):
    PENDING = "pending"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class OutboxStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
