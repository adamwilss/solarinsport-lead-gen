import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from solar_sport.database import Base


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    session = factory()
    yield session
    session.close()
    engine.dispose()
