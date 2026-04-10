import argparse
import asyncio

from solar_sport.config import get_settings
from solar_sport.database import Base, get_engine, get_session_factory
from solar_sport.discovery.wikipedia import fetch_uk_stadiums
from solar_sport.discovery.pipeline import run_discovery
from solar_sport.scoring.engine import score_lead, Priority
from solar_sport.models import Lead, Stadium


def main():
    parser = argparse.ArgumentParser(description="Solar & Sport Engine CLI")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("init-db", help="Create database tables")
    sub.add_parser("discover", help="Run stadium discovery from Wikipedia")
    sub.add_parser("score-all", help="Score all unscored leads")
    sub.add_parser("serve", help="Run the API server")

    args = parser.parse_args()

    if args.command == "init-db":
        settings = get_settings()
        engine = get_engine(settings.DATABASE_URL)
        Base.metadata.create_all(engine)
        print("Database tables created.")

    elif args.command == "discover":
        settings = get_settings()
        engine = get_engine(settings.DATABASE_URL)
        Base.metadata.create_all(engine)
        session = get_session_factory(settings.DATABASE_URL)()

        print("Fetching stadiums from Wikipedia...")
        stadiums = asyncio.run(fetch_uk_stadiums())
        print(f"Found {len(stadiums)} stadiums. Persisting...")
        count = run_discovery(session, stadiums)
        print(f"Added {count} new stadiums.")
        session.close()

    elif args.command == "score-all":
        settings = get_settings()
        session = get_session_factory(settings.DATABASE_URL)()

        leads = session.query(Lead).filter(Lead.score.is_(None)).all()
        for lead in leads:
            stadium = session.query(Stadium).get(lead.stadium_id)
            data = {
                "capacity": stadium.capacity or 0,
                "is_professional": bool(stadium.league),
                "has_partnerships": bool(stadium.hospitality_url),
                "has_sustainability": bool(stadium.sustainability_url),
                "is_multi_use": False,
                "contact_count": len(lead.contacts),
                "has_sponsors": False,
            }
            result = score_lead(data)
            lead.score = result["score"]
            lead.priority = result["priority"].value

        session.commit()
        print(f"Scored {len(leads)} leads.")
        session.close()

    elif args.command == "serve":
        import uvicorn
        uvicorn.run("solar_sport.api.app:app", host="0.0.0.0", port=8000, reload=True)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
