import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.models import Role
from app.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_password_hash_uses_argon2id_and_verifies() -> None:
    password_hash = hash_password("clave-segura-123")

    assert password_hash.startswith("$argon2id$")
    assert verify_password(password_hash, "clave-segura-123")
    assert not verify_password(password_hash, "otra-clave")
    assert not verify_password("no-es-un-hash", "clave-segura-123")


def test_access_token_round_trip() -> None:
    user_id, session_id = uuid.uuid4(), uuid.uuid4()
    claims = decode_access_token(create_access_token(user_id, session_id, Role.ADMIN))

    assert claims.user_id == user_id
    assert claims.session_id == session_id
    assert claims.role is Role.ADMIN


def test_expired_access_token_is_rejected() -> None:
    token = create_access_token(
        uuid.uuid4(),
        uuid.uuid4(),
        Role.SELLER,
        now=datetime.now(UTC) - timedelta(minutes=16),
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_token_signed_with_another_key_is_rejected() -> None:
    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "sid": str(uuid.uuid4()),
            "role": "admin",
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        },
        "otra-clave-de-firma-muy-larga-para-hs256",
        algorithm="HS256",
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_token_without_algorithm_is_rejected() -> None:
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "sid": str(uuid.uuid4()), "role": "admin"},
        key=None,
        algorithm="none",
    )
    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_refresh_token_hash_is_stable_and_not_the_token() -> None:
    assert hash_refresh_token("abc") == hash_refresh_token("abc")
    assert hash_refresh_token("abc") != "abc"
    assert len(hash_refresh_token("abc")) == 64
