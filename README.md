# ELATŌ

ELATŌ is the full-stack platform for **ELATŌ CELEBRÉ** — a premium dessert café, boutique stay, and celebration destination in Panemangalore, Karnataka. This monorepo contains the public marketing site, the internal admin CMS, and the API that powers both.

The platform lets the business manage its entire public presence — menu, gallery, hero media, event packages, stay listings, reviews, offers, and site copy — from a dedicated admin panel, with changes reflected on the public site in real time via a shared Supabase-backed API.

## Features

- **Public website** — Home, Célébré (café menu), Stay, and Events pages with animated hero videos, a searchable/filterable menu, an image gallery, featured reviews, and a scratch-card offer flow
- **Admin CMS** — full CRUD over categories, menu items, specials, gallery, event packages, rooms, reviews, hero backgrounds, video showcase, offers/registrations, and freeform site content blocks
- **Custom authentication** — email/password admin login with JWT access tokens, rotating refresh tokens, "log out everywhere," and email-based password reset (no third-party auth provider)
- **Role-based access** — `owner` / `admin` / `editor` roles enforced per endpoint
- **Media pipeline** — uploaded images are automatically re-encoded into AVIF/WebP/JPEG at three responsive breakpoints; hero and showcase videos are validated, optionally transcoded to H.264 MP4, and a poster frame is extracted automatically
- **Site content editor** — admins edit homepage/section copy and images as structured key-value blocks, no redeploy required
- **Scratch-card offers** — a single active promotional offer with visitor registration, duplicate-claim prevention, and admin-side redemption tracking
- **Google Reviews sync** — scheduled aggregate rating/count sync from Google Places
- **Maintenance mode** — a single admin toggle that gates the entire public site behind a maintenance page
- **Analytics** — first-party pageview/event tracking table, plus optional GA4 and Microsoft Clarity
- **WhatsApp enquiries** — enquiry forms across the site route to the business's WhatsApp number

## Tech Stack

**Frontend (`elato-web`)**
React 19 · TypeScript · Vite · Tailwind CSS 4 · Framer Motion · React Router · React Helmet Async

**Admin Dashboard (`elato-admin`)**
React 19 · TypeScript · Vite · Tailwind CSS 4 · TanStack Query · Axios · dnd-kit (drag-to-reorder)

**Backend (`elato-backend`)**
FastAPI (Python 3.11) · Pydantic Settings · PyJWT · Argon2id password hashing · httpx · Pillow + pillow-avif-plugin (image encoding) · PyAV + imageio-ffmpeg (video probing/transcoding)

**Database**
Supabase-hosted PostgreSQL 17 — 21 tables, row-level security, foreign keys, generated `uuid` primary keys

**Storage**
Supabase Storage — 12 buckets for images and video, served as optimized public URLs

**Authentication**
Custom JWT-based admin auth (not Supabase Auth) — the backend issues and verifies its own tokens; Supabase is used purely as a database and object store

**Deployment**
Render (backend, Python runtime) · Vercel (both frontends, static Vite builds)

**External integrations**
Google Places API (reviews sync) · GA4 / Microsoft Clarity (optional analytics) · WhatsApp (`wa.me` links for enquiries)

## Architecture

```
┌─────────────────┐      ┌──────────────────┐
│    elato-web     │      │    elato-admin    │
│  (public site)   │      │   (admin CMS)     │
└────────┬─────────┘      └────────┬──────────┘
         │        HTTPS / JSON REST         │
         └───────────────┬───────────────────┘
                          ▼
                ┌───────────────────┐
                │   elato-backend    │
                │   FastAPI (Render) │
                └─────────┬──────────┘
                          │ service-role key
                          ▼
                ┌───────────────────┐
                │      Supabase      │
                │  Postgres + Storage │
                └───────────────────┘
```

Neither frontend talks to Supabase directly — **all** data and media flow through `elato-backend`, which is the only component holding Supabase credentials. This keeps the service-role key server-side only, lets the backend enforce authorization independently of Postgres RLS, and means the public/admin apps only ever need to know the backend's URL.

- **Public tables** (categories, menu items, gallery, reviews, etc.) are also protected by Postgres Row-Level-Security policies that allow anonymous `SELECT` on active/public rows — a defense-in-depth layer, since the backend already enforces access control on top.
- **Admin-only tables** (admins, media, tokens, analytics) have RLS enabled with **no** anonymous policies at all — they are reachable only through the backend's service-role connection.
- The backend is stateless; all state lives in Postgres and Storage, so it can be scaled horizontally without sticky sessions (aside from the in-process JWT cache).

## Folder Structure

```
Elato/
├── elato-web/              Public website (React + Vite)
│   └── src/
│       ├── pages/            Route-level page components (Home, Stay, Célébré, Events)
│       ├── components/       Shared and page-specific UI components
│       ├── content/           Typed content shapes mirroring backend response models
│       ├── lib/               API client, repositories, hooks
│       └── test/              Vitest unit tests
│
├── elato-admin/             Admin CMS (React + Vite)
│   └── src/
│       ├── features/          One folder per admin domain (menu, gallery, offers, settings, …)
│       ├── api/                Typed API client functions
│       ├── components/        Shared admin UI (tables, forms, drag-and-drop lists)
│       ├── context/            Auth/session context
│       └── types/              Shared TypeScript API types
│
├── elato-backend/           FastAPI service
│   └── app/
│       ├── api/v1/             Route modules — one file per resource, `public.py` for anon-readable data
│       ├── core/                Settings, JWT/security, structured logging, error handling
│       ├── repositories/       Supabase query layer — the only code that talks to `app/db.py`
│       ├── services/            Business logic (media pipeline, hero video, offers, auth, …)
│       ├── schemas/             Pydantic request/response models
│       └── middleware/          Request-ID/logging middleware
│   └── migrations/             Ordered, hand-written SQL migration files (schema history)
│
├── docs/                    Shared project documentation (PRD, etc.)
├── render.yaml              Render deployment blueprint (backend)
└── elato-web/, elato-admin/vercel.json   Vercel deployment config (frontends)
```

Each app is fully independent — its own `package.json`/`requirements.txt`, own build tooling, own `.env`. There is no shared package or monorepo build tool (Turborepo/Nx); they're grouped under one root purely for organization.

## Environment Variables

No `.env` file is committed anywhere in this repo — every app ships an `.env.example` documenting what it needs.

### `elato-backend/.env`

| Variable | Purpose |
|---|---|
| `ENV` | `development` or `production` — gates dev-only conveniences (e.g. permissive CORS regex) |
| `PORT` | Port the FastAPI server binds to |
| `JWT_SECRET` | Signs/verifies admin JWTs. Must be a fresh, random secret — never reused from Supabase's own keys. The app refuses to boot in production with the placeholder default |
| `SUPABASE_URL` | The Supabase project's API URL. The backend's only connection to the database and storage |
| `SUPABASE_SECRET_KEY` | Supabase **service-role** secret key — server-side only, bypasses Row-Level Security by design. Must never reach a frontend build or client-side code |
| `WHATSAPP_BUSINESS_NUMBER` | Business WhatsApp number used to build `wa.me` enquiry links |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of origins allowed to call the API in production |
| `FRONTEND_ADMIN_URL` | Admin panel origin, used to build password-reset links sent by email |
| `GOOGLE_PLACES_API_KEY` / `GOOGLE_PLACE_ID` | Optional — enables the live Google Reviews sync job. Sync is a stubbed no-op until both are set |
| `SYNC_CRON_SECRET` | Shared secret required in the `X-Cron-Secret` header to trigger `POST /api/v1/sync/reviews` from an external scheduler |

Two additional keys (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWKS_URL`) are documented in `.env.example` for completeness but are not currently read by any code path — reserved for a possible future move to Supabase Auth.

### `elato-web/.env` and `elato-admin/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the `elato-backend` API (no trailing slash). The **only** required variable — neither frontend talks to Supabase directly |
| `VITE_GA4_MEASUREMENT_ID` | Optional — Google Analytics 4. No-op until set (`elato-web` only) |
| `VITE_CLARITY_PROJECT_ID` | Optional — Microsoft Clarity session recording. No-op until set (`elato-web` only) |

## Local Development

**Requirements:** Node.js 20+, Python 3.11, a Supabase project (URL + service-role key).

### Backend

```bash
cd elato-backend
python -m venv .venv
.venv\Scripts\activate        # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # fill in JWT_SECRET, SUPABASE_URL, SUPABASE_SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/health` and `http://localhost:8000/docs` (interactive OpenAPI docs).

### Public website

```bash
cd elato-web
npm install
cp .env.example .env          # defaults to http://localhost:8000
npm run dev                   # http://localhost:5173
```

### Admin panel

```bash
cd elato-admin
npm install
cp .env.example .env
npm run dev                   # http://localhost:5174
```

Create the first admin account with `elato-backend/scripts/create_first_admin.py` once the database schema is applied.

## Database

### Supabase overview

The project uses Supabase purely as **managed Postgres + Storage** — Supabase Auth is not used; authentication is handled entirely by the backend. Schema is defined by ordered SQL files in `elato-backend/migrations/`, applied via the Supabase SQL editor or CLI.

### Database structure

21 tables in the `public` schema, grouped by domain:

- **Content**: `categories`, `menu_items`, `specials`, `gallery`, `event_packages`, `rooms`, `reviews`, `site_content`, `settings`, `hero_backgrounds`, `video_gallery`
- **Admin/auth**: `admins`, `refresh_tokens`, `password_reset_tokens`
- **Engagement**: `enquiries`, `analytics_events`, `offers`, `offer_registrations`
- **Media**: `media` (metadata for every uploaded image, referenced by `image_id` foreign keys across content tables)
- **Legacy (retained, unused)**: `instagram_posts`, `instagram_sync_status` — the Instagram Reels integration was superseded by the admin-managed video showcase (`video_gallery`)

All primary keys are `uuid` (`gen_random_uuid()`), with standard `created_at`/`updated_at` timestamps and foreign keys enforcing referential integrity (e.g. `menu_items.category_id → categories.id` cascades on delete).

### Storage buckets

| Bucket | Public | Contents |
|---|---|---|
| `categories` | ✅ | Category cover images |
| `menu` | ✅ | Menu item images |
| `gallery` | ✅ | Gallery photos |
| `hero` | ✅ | Hero images and video poster frames |
| `hero-videos` | ✅ | Desktop/mobile hero background videos |
| `events` | ✅ | Event package images |
| `stay` | ✅ | Stay/rooms images |
| `public-assets` | ✅ | Misc. public assets |
| `video-gallery` | ✅ | Admin-uploaded video showcase clips |
| `reviews`, `logos` | ✅ | Reserved, currently unused |
| `uploads` | ❌ | Private — reserved for non-public uploads |

Every uploaded image is stored as multiple optimized variants (`lg`/`sm`/`thumbnail` × `webp`/`avif`/`jpg`) under a per-upload folder, so the frontend can request the smallest suitable format/size via `srcset`.

### RLS & policies

Row-Level Security is enabled on **every** table. Two access patterns are used:

1. **Public-facing content** (`categories`, `menu_items`, `specials`, `gallery`, `event_packages`, `rooms`, `reviews`, `site_content`, `settings`, `hero_backgrounds`, `video_gallery`) has an anonymous `SELECT` policy scoped to active/published rows — e.g. `menu_items` only exposes rows where `is_available = true`.
2. **Backend-only tables** (`admins`, `media`, `analytics_events`, `refresh_tokens`, `password_reset_tokens`, `offers`, `offer_registrations`, `instagram_*`) have **no** anonymous policy at all — RLS blocks all anon access by default, and only the backend's service-role connection (which bypasses RLS) can read or write them.

`enquiries` is the one exception with a public **insert-only** policy — anyone can submit an enquiry, no one can read them back without the service role.

## Deployment

### Supabase

The database and storage are provisioned once per environment. To promote schema changes, apply new files from `elato-backend/migrations/` in order against the target project.

### Backend (Render)

Defined in [`render.yaml`](render.yaml) — Python runtime, Singapore region, auto-deploy from `main`. Real secrets are intentionally **not** stored in the blueprint (`sync: false` for every credential); they must be set once in the Render dashboard's Environment tab. See the Render checklist maintained alongside this repo for the exact variable list.

### Frontends (Vercel)

Both `elato-web` and `elato-admin` deploy as static Vite builds — see their respective `vercel.json`. Environment variables (`VITE_API_BASE_URL`, and optionally `VITE_GA4_MEASUREMENT_ID`/`VITE_CLARITY_PROJECT_ID` for `elato-web`) are set per-project in the Vercel dashboard, not committed to the repo.

## Media Upload Pipeline

1. An admin uploads an image or video through `elato-admin`.
2. The backend validates file type/size against per-bucket limits.
3. **Images** are processed with Pillow: resized to three breakpoints (large/small/thumbnail) and re-encoded into three formats each (AVIF, WebP, JPEG fallback) — nine files per upload, uploaded to the target Supabase Storage bucket under a shared folder.
4. **Videos** (hero backgrounds, video showcase) are probed with PyAV for duration/dimensions; if not already H.264 MP4, they're transcoded via a bundled static ffmpeg binary (no system dependency). A poster frame is extracted automatically for hero videos.
5. The database row (`media`, `hero_backgrounds`, or `video_gallery`) stores the bucket + path; public URLs are resolved on read via the Supabase Storage client, never hand-built or cached as static strings — so a storage/project change never requires touching stored data.
6. Replacing or deleting content triggers cleanup of the old storage object(s), preventing orphaned files.

## Security

- **Authentication**: custom email/password login, Argon2id password hashing (not bcrypt) — no third-party identity provider
- **JWT**: short-lived access tokens (15 min default) signed with `JWT_SECRET`, verified on every admin request via a FastAPI dependency
- **Refresh tokens**: long-lived (7 days default), stored hashed in `refresh_tokens`, individually revocable — supports "log out everywhere"
- **Password reset**: single-use, expiring tokens in `password_reset_tokens`, delivered by email with a link back to the admin panel
- **Role-based access**: `owner` / `admin` / `editor` roles checked per endpoint via `require_role(...)`
- **RLS**: enabled on every table as a defense-in-depth layer beneath backend authorization (see [Database](#database) above)
- **Storage permissions**: all writes/deletes go through the backend's service-role key; public buckets only expose what the backend explicitly serves a public URL for
- **Production boot guard**: the backend refuses to start in production if `JWT_SECRET` is still the development placeholder
- **CORS**: explicit origin allowlist in production; permissive localhost regex only in development

## API Overview

Base path: `/api/v1`. Full interactive docs at `/docs` (FastAPI/OpenAPI).

**Public** (`public.py`, no auth) — `GET /categories`, `/menu-items`, `/specials`, `/gallery`, `/event-packages`, `/rooms`, `/reviews/featured`, `/reviews/aggregate`, `/video-gallery`, `/hero-backgrounds`, `/site-content[/​{key}]`, `/offers/active`, `/maintenance-status`; `POST /enquiries`, `/offers/register`, `/analytics/events`

**Admin auth** (`/admin/auth`) — `POST /login`, `/refresh`, `/logout`, `/change-password`, `/password-reset-request`, `/password-reset-confirm`

**Admin CRUD** (`/admin/*`, JWT + role required) — full create/update/delete/reorder endpoints for categories, menu items, specials, gallery, event packages, rooms, reviews, hero backgrounds, video gallery, offers, offer registrations, site content, settings, media, plus admin user management and a dashboard summary endpoint

**Sync** (`/sync`, cron-secret header) — `POST /reviews` triggers the Google Places reviews aggregate sync

**Health** — `GET /health`, unauthenticated, used by Render's health check

## Future Improvements

- Wire `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_JWKS_URL` to a real use case or remove them if a move to Supabase Auth is no longer planned
- Automated database migration tooling (Supabase CLI in CI) instead of manual SQL editor application
- Reinstate a scheduled sync workflow now that `SYNC_CRON_SECRET` has a live consumer (`POST /api/v1/sync/reviews`)
- Expand E2E coverage beyond the current mocked-API Playwright suite to include real staging-environment runs

## License

Proprietary — all rights reserved. This codebase is not licensed for reuse, redistribution, or modification outside of ELATŌ's own development team without explicit permission.

## Credits

Built for **ELATŌ CELEBRÉ**, Panemangalore, Karnataka — a premium ice cream, café, events, and stay destination founded on 30+ years of ice cream industry expertise.
