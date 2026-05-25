from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routes import extract, solar, grid, weather

app = FastAPI(title="SolarFit API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract.router)
app.include_router(solar.router)
app.include_router(grid.router)
app.include_router(weather.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "solarfit-backend"}
