# API – Tienda Express Merk

FastAPI + SQLAlchemy 2 + PostgreSQL.

```bash
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --app-dir src
```
