from solar_sport.config import Settings


def test_default_settings():
    settings = Settings(DATABASE_URL="sqlite:///test.db")
    assert settings.DATABASE_URL == "sqlite:///test.db"
    assert settings.CORS_ORIGINS == ["http://localhost:5173"]


def test_cors_origins_from_comma_separated():
    settings = Settings(
        DATABASE_URL="sqlite:///test.db",
        CORS_ORIGINS="http://localhost:3000,http://localhost:5173",
    )
    assert len(settings.CORS_ORIGINS) == 2
