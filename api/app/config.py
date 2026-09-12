import os

from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

ALLOWED_ORIGINS =[
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

APP_VERSION = "0.1.0"

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_ROWS = 20_000
DEFAULT_CURRENCY = "USD"

SAMPLE_CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_messy.csv"

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy .env.example to .env and fill in your "
        "Neon connection string."
    )