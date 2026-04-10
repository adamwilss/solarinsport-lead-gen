from sqlalchemy.orm import Session

from solar_sport.config import get_settings
from solar_sport.database import get_session_factory

_factory = None


def get_db():
    global _factory
    if _factory is None:
        _factory = get_session_factory(get_settings().DATABASE_URL)
    session = _factory()
    try:
        yield session
    finally:
        session.close()
