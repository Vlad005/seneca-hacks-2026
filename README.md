# Helios

Most Canadian homeowners who consider solar never actually install. Helios changes that. Snap a photo of your hydro bill and in sixty seconds get a personalized, property-level answer on whether solar will pay off on your roof — and whether your local grid will even let you connect.

## Stack

- **Frontend** — Next.js + TypeScript + Tailwind, Mapbox GL + ShadeMap for the roof view
- **Backend** — FastAPI + Python 3.13, `pvlib` for the solar math, GPT-4o-mini vision for bill extraction

## Setup

You'll need Node 18+, Python 3.10+, and API keys for OpenAI, Mapbox, and ShadeMap.

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add OPENAI_API_KEY

# Frontend
cd ../frontend
npm install
# create .env.local with:
#   NEXT_PUBLIC_MAPBOX_TOKEN=...
#   NEXT_PUBLIC_SHADEMAP_KEY=...
#   NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## Run

```bash
# Terminal 1
cd backend && source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

Open <http://localhost:3000>.
