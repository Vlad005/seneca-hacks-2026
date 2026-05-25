# SolarFit

Snap your hydro bill, see what your roof can do, in 30 seconds.

A POC that takes a photo of an Ontario electricity bill, extracts your address and usage, and shows you a real, physics-grounded estimate of what rooftop solar would save you — with a cinematic shadow animation on top of a satellite view of your actual roof.

---

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| Map / shadows | Mapbox GL JS v3 + `mapbox-gl-shadow-simulator` (ShadeMap SDK) |
| Charts / motion | Recharts + framer-motion |
| Backend | FastAPI + Python 3.13 |
| Bill extraction | OpenAI GPT-4o-mini vision (no OCR step — model reads the photo directly) |
| Solar math | `pvlib` (NREL) — sun position, clear-sky, tilted-surface irradiance, PV generation |
| Weather | Open-Meteo Historical Weather API (free, no key) |
| Grid data | OEB CCIM ArcGIS FeatureServer + OSM Overpass |
| Rebates | Curated JSON of Ontario + federal programs as of 2026-05 |

---

## Project structure

```
solarfit/
├── backend/                  FastAPI service
│   ├── main.py               app entry, CORS, /health
│   ├── requirements.txt
│   ├── .env.example          AWS_* + OPENAI_API_KEY
│   ├── routes/
│   │   ├── extract.py        POST /extract-bill  (Textract + GPT-4o-mini)
│   │   ├── solar.py          POST /pv-analysis    (pvlib + precomputed shadows)
│   │   ├── weather.py        GET  /cloud-history  (Open-Meteo)
│   │   └── grid.py           GET  /connection-check (CCIM + OSM)
│   └── cache/                cached responses for demo address
│
├── frontend/                 Next.js app
│   ├── app/
│   │   ├── page.tsx          /            landing
│   │   ├── sandbox/page.tsx  /sandbox     ShadeMap smoke test
│   │   └── …                 /upload, /processing, /confirm, /rebates,
│   │                         /usage, /analyzing, /results (to come)
│   └── .env.local.example    NEXT_PUBLIC_MAPBOX_TOKEN, NEXT_PUBLIC_SHADEMAP_KEY,
│                             NEXT_PUBLIC_API_BASE
│
├── .gitignore
└── README.md                 (this file)
```

---

## Prerequisites

- Node ≥ 18 (we ran on 20.11)
- Python ≥ 3.10 (uv installs 3.13 by default — fine)
- [`uv`](https://github.com/astral-sh/uv) (or plain `pip` works too)

### API keys you need

| Key | Used for | Where to get it |
| --- | --- | --- |
| `OPENAI_API_KEY` | GPT-4o-mini vision (bill extraction) | platform.openai.com (~$0.0001/bill) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox satellite + vector tiles | account.mapbox.com (free tier) |
| `NEXT_PUBLIC_SHADEMAP_KEY` | ShadeMap shadow overlay | shademap.app/about/ — email signup, educational tier |

---

## Setup

```bash
git clone <repo>
cd solarfit
```

### Backend

```bash
cd backend
uv venv                                  # creates .venv with Python 3.13
source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env                     # then paste your keys into .env
```

### Frontend

```bash
cd ../frontend
npm install                              # already done by create-next-app
cp .env.local.example .env.local         # then paste your tokens into .env.local
```

---

## Running

Open two terminals.

**Terminal 1 — backend** (FastAPI, port 8000):

```bash
cd solarfit/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

- Health check: <http://localhost:8000/health>
- Interactive docs: <http://localhost:8000/docs>

**Terminal 2 — frontend** (Next.js, port 3000):

```bash
cd solarfit/frontend
npm run dev
```

- Landing: <http://localhost:3000>
- ShadeMap smoke test: <http://localhost:3000/sandbox>

The frontend talks to the backend via `NEXT_PUBLIC_API_BASE` (default `http://localhost:8000`).

---

## What's real vs mocked

| Component | Status |
| --- | --- |
| Bill extraction | **REAL** — GPT-4o-mini vision on the user's photo (no OCR step) |
| Address geocoding | **REAL** — Mapbox |
| Roof segments + panel layout | **PRE-PREPPED** — one-time pull from MS Canadian Building Footprints + manual panel placement on the demo roof |
| Solar math (sun position, irradiance, generation) | **REAL** — pvlib, the same library NREL ships |
| Cloud-adjusted irradiance | **REAL** — Open-Meteo historical solar radiation API |
| Shadow occlusion (math) | **REAL** — precomputed shadow-occlusion lookup table for the demo roof |
| Shadow animation (visual) | **REAL** — ShadeMap SDK over Mapbox |
| Usage curve customization | **REAL** — recharts draggable points, recalculates live |
| Payback math | **REAL** — in-browser, real hourly generation × user curve × Ontario rates |
| Rebate eligibility filtering | **REAL** — 3-question filter against curated program list |
| Connection readiness checks | **REAL where possible** — labelled "source unavailable" where CCIM scrape fails |
| Installer matching | **MOCKED** — 3 hardcoded cards, "request quotes" disabled |

Only the **HRS / Net Metering** choice currently drives the payback math. Other rebate programs are surfaced as discoverable real options with links to the administering body.

---

## Build status

- [x] **Step 1** — Repo scaffold, FastAPI hello, Next.js scaffold, ShadeMap smoke test on `/sandbox`
- [ ] Step 2 — `/extract-bill` + `/pv-analysis` end-to-end on demo photo
- [ ] Step 3 — `/cloud-history` + `/connection-check`
- [ ] Step 4 — Frontend: landing, upload, processing, confirm
- [ ] Step 5 — Rebate discovery screen
- [ ] Step 6 — Usage curve
- [ ] Step 7 — Results page (ShadeMap hero, sunlight graphs, readiness, payback)
