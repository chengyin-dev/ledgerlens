from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping = True)

SessionLocal = sessionmaker(bind = engine, autoflush = False, autocommit = False)



class Base(DeclarativeBase):
    """Base class all ORM models inherit from."""


def get_db():
    """Yield a database session, closing it when the request finishes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()