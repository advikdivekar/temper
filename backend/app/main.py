"""main.py

WHAT THIS FILE DOES
    Creates the web application and wires everything together.

RUN IT
    cd backend
    PYTHONPATH=. .venv/bin/uvicorn app.main:create_app --factory --reload
    then open http://localhost:8000/docs for the interactive API page.

CONCEPTS IN THIS FILE
    App factory
        create_app builds a fresh app from settings, so tests can make
        an app with an in memory database.
    app.state
        Shared objects (session factory, settings) kept on the app and
        read by routes through dependencies.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import os

from app.api import (
    routes_auth, routes_demo, routes_insights, routes_plant,
    routes_requests, routes_statements, routes_trust, routes_verify,
)
from app.config import Settings, load_settings
from app.database import make_session_factory
from app.services.reference_data import load_reference_data


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(title="Temper API")
    app.state.settings = settings
    app.state.session_factory = make_session_factory(settings.database_url)

    with app.state.session_factory() as session:
        load_reference_data(session, settings.data_dir)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(routes_auth.router)
    app.include_router(routes_plant.router)
    app.include_router(routes_statements.router)
    app.include_router(routes_trust.router)
    app.include_router(routes_insights.router)
    app.include_router(routes_requests.router)
    app.include_router(routes_verify.router)
    if os.getenv("DEMO_MODE", "1") == "1":
        app.include_router(routes_demo.router)
    return app

