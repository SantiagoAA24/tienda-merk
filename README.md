# Tienda Express Merk

PWA de ventas y facturación electrónica DIAN para una tienda de barrio en Colombia.

## Requisitos

- Node.js 22+
- [uv](https://docs.astral.sh/uv/) (Python 3.12+)
- Docker y Docker Compose

## Base de datos

```bash
docker compose up -d
```

PostgreSQL queda en `localhost:5432` con usuario/contraseña/base `tienda`. Si el puerto 5432 ya está ocupado, cambia el mapeo en `docker-compose.yml` (por ejemplo `"5433:5432"`) y actualiza `DATABASE_URL` en `apps/api/.env`.

## Frontend (`apps/web`)

```bash
cd apps/web
npm install
npm run tokens   # genera src/styles/tokens.css desde el design system
npm run dev      # http://localhost:5173
```

Scripts útiles:

| Comando | Descripción |
|---------|-------------|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript estricto |
| `npm test` | Vitest |
| `npm run build` | Build de producción |

## Backend (`apps/api`)

```bash
cd apps/api
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --app-dir src
```

La API queda en `http://localhost:8000`. Health: `GET /health`.

Scripts útiles:

| Comando | Descripción |
|---------|-------------|
| `uv run ruff check .` | Lint |
| `uv run mypy src` | Typecheck |
| `uv run pytest` | Pruebas |

## CI

En cada push a `main` y en cada PR, GitHub Actions corre en paralelo lint + typecheck + test de web y ruff + mypy + pytest de api (con PostgreSQL).
