import os

from dotenv import load_dotenv

load_dotenv()

APP_VERSION = "0.1.0"

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy .env.example to .env and fill in your "
        "Neon connection string."
    )