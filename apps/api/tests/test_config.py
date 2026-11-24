import pytest
from pydantic import ValidationError

from app.config import Settings


def test_production_requires_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(app_env="production", jwt_secret="", _env_file=None)  # type: ignore[call-arg]


def test_production_rejects_short_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="32"):
        Settings(app_env="production", jwt_secret="corto", _env_file=None)  # type: ignore[call-arg]


def test_production_cookie_is_secure_by_default() -> None:
    settings = Settings(app_env="production", jwt_secret="x" * 40, _env_file=None)  # type: ignore[call-arg]

    assert settings.cookie_secure is True


def test_development_generates_a_secret_and_allows_http_cookie() -> None:
    settings = Settings(app_env="development", jwt_secret="", _env_file=None)  # type: ignore[call-arg]

    assert len(settings.jwt_secret) >= 32
    assert settings.cookie_secure is False
