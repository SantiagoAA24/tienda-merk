import secrets
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

LOCAL_ENVS = {"development", "test"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    database_url: str = "postgresql+psycopg://tienda:tienda@localhost:5432/tienda"

    jwt_secret: str = ""
    access_token_minutes: int = 15
    refresh_persistent_days: int = 30
    refresh_session_hours: int = 12
    cookie_secure: bool | None = None
    refresh_cookie_name: str = "tem_refresh"
    refresh_cookie_path: str = "/auth"

    @model_validator(mode="after")
    def _check_secrets(self) -> "Settings":
        if not self.jwt_secret:
            if self.app_env not in LOCAL_ENVS:
                raise ValueError("JWT_SECRET es obligatorio fuera de desarrollo")
            # Local only: tokens stop being valid when the process restarts.
            self.jwt_secret = secrets.token_urlsafe(48)
        elif len(self.jwt_secret) < 32 and self.app_env not in LOCAL_ENVS:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
        if self.cookie_secure is None:
            self.cookie_secure = self.app_env not in LOCAL_ENVS
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
