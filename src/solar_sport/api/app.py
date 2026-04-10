from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from solar_sport.config import get_settings
from solar_sport.database import Base, get_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    engine = get_engine(settings.DATABASE_URL)
    Base.metadata.create_all(engine)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Solar & Sport Engine", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from solar_sport.api.leads import router as leads_router
    from solar_sport.api.outreach import router as outreach_router
    from solar_sport.api.dashboard import router as dashboard_router

    app.include_router(leads_router, prefix="/api/leads", tags=["leads"])
    app.include_router(outreach_router, prefix="/api/outreach", tags=["outreach"])
    app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])

    return app


app = create_app()
