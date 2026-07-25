"""
Import-sanity checks. These catch the class of bug that only shows up at
process startup — a bad import, a missing dependency, a router that fails to
register — which unit tests of individual functions won't catch, but which
would take the whole service down in production if it slipped through.
"""

import importlib


def test_app_module_imports_and_exposes_fastapi_app():
    from app.main import app
    from fastapi import FastAPI

    assert isinstance(app, FastAPI)


def test_all_api_v1_route_modules_import_cleanly():
    # Mirrors app/api/v1/router.py's own import list — if a new route module
    # is added there but is broken, this catches it without needing a live
    # server or a real request.
    modules = [
        "app.api.v1.admin_categories",
        "app.api.v1.admin_dashboard",
        "app.api.v1.admin_event_packages",
        "app.api.v1.admin_gallery",
        "app.api.v1.admin_media",
        "app.api.v1.admin_menu_items",
        "app.api.v1.admin_reviews",
        "app.api.v1.admin_rooms",
        "app.api.v1.admin_settings",
        "app.api.v1.admin_site_content",
        "app.api.v1.admin_specials",
        "app.api.v1.admin_users",
        "app.api.v1.admin_video_gallery",
        "app.api.v1.auth",
        "app.api.v1.public",
        "app.api.v1.sync",
        "app.api.v1.router",
    ]
    for name in modules:
        importlib.import_module(name)


def test_app_has_registered_routes_beyond_health():
    from app.main import app

    # Read via the OpenAPI schema rather than introspecting `app.routes`
    # directly — this FastAPI version's route list includes internal
    # `_IncludedRouter` entries without a `.path` attribute, so this is the
    # stable, version-independent way to ask "what endpoints exist".
    paths = set(app.openapi()["paths"].keys())
    assert "/health" in paths
    # api_router is mounted at /api/v1 — spot-check that at least one v1
    # route registered successfully.
    assert any(p.startswith("/api/v1") for p in paths)
