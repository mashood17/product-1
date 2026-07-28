# ELATŌ Backend

FastAPI service for the ELATŌ platform. Architecture (Phase 2) is real and verified running: config, structured logging, request-ID middleware, CORS, global error handling, and JWT/DI auth utilities. No business endpoints exist yet, and no live database connection exists — see `migrations/0001_initial_schema.sql` for the full schema, written but not yet applied to a live Supabase project (needs `SUPABASE_URL`/`SUPABASE_SECRET_KEY`).

## Structure

```
app/
  main.py                FastAPI entrypoint — health check, middleware, error handlers wired in
  api/v1/                 Versioned route modules go here (PRD Ch. 34: /api/v1/*) — empty, Phase 5
  core/
    config.py              Pydantic Settings, fails fast on bad prod config
    logging.py              Structured JSON logs, UTF-8-safe, per-request ID
    security.py             JWT issue/verify, Argon2id password hashing
    exceptions.py            One error shape ({"error":{"code","message"}}) for the whole API
    dependencies.py           get_current_admin / require_role DI pattern (JWT verify works; DB lookup stubbed until Phase 3 data lands)
  middleware/
    request_logging.py        Assigns request ID, logs method/path/status/timing
  models/ schemas/ services/ repositories/ utils/ storage/   Empty — Phase 5+
migrations/
  0001_initial_schema.sql    All 13 tables, indexes, RLS policies, storage buckets — written, not yet applied
```

## Local setup

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env           # fill in JWT_SECRET at minimum
uvicorn app.main:app --reload --port 8000
```

Then visit `http://localhost:8000/health` and `http://localhost:8000/docs`.

## Applying the schema

Once `SUPABASE_URL`/`SUPABASE_SECRET_KEY` are in `.env`:

```bash
# Via the Supabase CLI, or paste migrations/0001_initial_schema.sql into the
# Supabase dashboard's SQL editor and run it directly.
supabase db push
```

## Status

🟢 Live: real Supabase connection, full `/api/v1/*` business endpoint set (public + admin), and the complete admin auth flow (login, refresh rotation, logout, password reset) are wired in and verified running against a real project — see `app/api/v1/` and `app/services/auth_service.py`.

## Testing

```bash
python -m venv .venv
.venv\Scripts\activate              # Windows
pip install -r requirements-dev.txt  # requirements.txt + pytest
pytest -v
```

Tests live in `tests/`. `tests/conftest.py` sets dummy `SUPABASE_URL` /
`SUPABASE_SECRET_KEY` / `JWT_SECRET` env vars before anything imports
`app.core.config` — `Settings` requires those two Supabase values with no
default (fails fast at boot otherwise), but no test here makes a real
Supabase call, so placeholder values are enough. Covers:

- `test_health.py` — `/health` returns 200 and requires no auth (what
  Render's health check actually probes).
- `test_app_imports.py` — every `app/api/v1/*` route module imports cleanly,
  the FastAPI app builds, and routes beyond `/health` are registered. Catches
  boot-time breakage (bad import, router registration failure) that
  per-function unit tests wouldn't.

## Deployment (Render)

`render.yaml` at the repo root defines the Render blueprint: Python runtime,
`pip install -r requirements.txt`, `uvicorn app.main:app --host 0.0.0.0
--port $PORT`, health check at `/health`. Every real secret
(`JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, etc.) is declared with
`sync: false` so the blueprint never carries actual values — set them for
real in the Render dashboard's Environment tab per service.
