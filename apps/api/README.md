# API – Tienda Express Merk

FastAPI + SQLAlchemy 2 + PostgreSQL.

```bash
cp .env.example .env
uv sync
uv run alembic upgrade head
SEED_ADMIN_PASSWORD='una-clave-larga' uv run python -m app.seed   # datos de ejemplo
uv run uvicorn app.main:app --reload --app-dir src
```

## Autenticación

- `POST /auth/login` `{username, password, keep_session}` devuelve el token de acceso (15 min) y deja el token de refresco en una cookie `httpOnly` (`tem_refresh`, ruta `/auth`). Con `keep_session` la cookie dura 30 días; sin él, dura lo que dure el navegador (12 h máximo en el servidor).
- `POST /auth/refresh` rota el token de refresco. Si alguien reusa un token ya rotado, se cierra la sesión completa.
- `POST /auth/logout` revoca la sesión y borra la cookie.
- `GET /auth/me` devuelve el usuario actual.
- `POST /auth/password-reset-requests` registra la solicitud de "Recuperar contraseña" (siempre responde 202).
- `GET/POST/PATCH /users`: solo `admin`. Desactivar o cambiar la contraseña revoca las sesiones del usuario.

## Pruebas

`uv run pytest` usa una base aparte (`<DATABASE_URL>_test`, o `TEST_DATABASE_URL`), la crea si no existe y la reconstruye con las migraciones en cada corrida. Necesita PostgreSQL corriendo (`docker compose up -d`).
