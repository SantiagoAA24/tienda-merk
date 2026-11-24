from fastapi import FastAPI

from app.api.routes import auth, health, users

app = FastAPI(title="Tienda Express Merk API", version="0.0.1")
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
