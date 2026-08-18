from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.config import APP_VERSION 
from app.db import engine 

@asynccontextmanager
async def lifespan(app: FastAPI):
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("Database connection verified.")
    yield
    engine.dispose()
    print("Database connections closed.")

app = FastAPI(
    title = "LedgerLens API",
    description = "Cleans and analyzes small-business sales data.",
    version = APP_VERSION,
    lifespan = lifespan,
)

@app.get("/api/health")
def health() -> dict:
    return { "status": "ok", "version": APP_VERSION }
