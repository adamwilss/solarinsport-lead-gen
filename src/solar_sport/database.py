from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from solar_sport.config import get_settings


class Base(DeclarativeBase):
    pass


def get_engine(url: str | None = None):
    db_url = url or get_settings().DATABASE_URL
    return create_engine(db_url, echo=False)


def get_session_factory(url: str | None = None) -> sessionmaker[Session]:
    engine = get_engine(url)
    return sessionmaker(bind=engine)
