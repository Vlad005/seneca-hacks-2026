"""GET /cloud-history — 5-year averaged daily cloud cover for a location.

Used to characterize the local sky for the user. Returns 365 values
representing the day-of-year average cloud cover (%) over the last 5 calendar
years from Open-Meteo's historical archive.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import date

import numpy as np
import pandas as pd
import requests
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/cloud-history", tags=["weather"])
log = logging.getLogger("cloud-history")

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


def _fetch_cloud_cover(
    lat: float, lon: float, start: date, end: date, tz: str
) -> pd.Series:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": "cloud_cover",
        "timezone": tz,
    }
    resp = requests.get(ARCHIVE_URL, params=params, timeout=20)
    resp.raise_for_status()
    payload = resp.json()
    hourly = payload.get("hourly", {})
    times = pd.to_datetime(hourly.get("time", []))
    return pd.Series(
        hourly.get("cloud_cover", []),
        index=pd.DatetimeIndex(times).tz_localize(
            tz, nonexistent="shift_forward", ambiguous="NaT"
        ),
        name="cloud_cover",
    )


@router.get("")
async def cloud_history(
    lat: float = Query(...),
    lon: float = Query(...),
    years: int = Query(5, ge=1, le=10),
    tz: str = Query("America/Toronto"),
) -> dict:
    today = date.today()
    end = date(today.year - 1, 12, 31)
    start = date(today.year - years, 1, 1)

    try:
        series = await asyncio.to_thread(_fetch_cloud_cover, lat, lon, start, end, tz)
    except Exception as e:  # noqa: BLE001
        log.exception("Open-Meteo cloud-cover fetch failed")
        raise HTTPException(status_code=502, detail=f"Weather fetch failed: {e}")

    if series.empty:
        raise HTTPException(status_code=502, detail="No cloud data returned for this location.")

    # Daily mean cloud cover, then averaged by day-of-year across all included years.
    daily = series.resample("D").mean()
    by_doy = daily.groupby(daily.index.dayofyear).mean()
    # Pad/truncate to length 365 (drop Feb 29 if leap-year included).
    by_doy = by_doy.reindex(range(1, 366))
    values = [
        round(float(v), 1) if not np.isnan(v) else None for v in by_doy.values
    ]

    return {
        "lat": lat,
        "lon": lon,
        "years_averaged": years,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "daily_cloud_cover_pct": values,
        "annual_avg_pct": round(float(daily.mean()), 1),
    }
