"""Open-Meteo historical weather + clear-sky fetchers.

Free, no API key. Historical archive supports back to 1940 hourly. We default
to the most recent full year for "actual" pipeline and pvlib's location
clear-sky for the theoretical pipeline.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta

import pandas as pd
import pvlib
import requests

log = logging.getLogger("weather")

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


def fetch_open_meteo_hourly(
    lat: float,
    lon: float,
    start: date,
    end: date,
    tz: str = "America/Toronto",
) -> pd.DataFrame:
    """Hourly GHI/DNI/DHI + air temperature from Open-Meteo's historical archive.

    Returns DataFrame indexed by tz-aware datetime with columns:
        ghi (W/m^2), dni (W/m^2), dhi (W/m^2), temperature_2m (°C), cloud_cover (%).
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "hourly": ",".join([
            "shortwave_radiation",  # GHI
            "direct_radiation",     # DNI on horizontal surface — needs conversion
            "diffuse_radiation",    # DHI
            "temperature_2m",
            "cloud_cover",
        ]),
        "timezone": tz,
    }
    resp = requests.get(ARCHIVE_URL, params=params, timeout=20)
    resp.raise_for_status()
    payload = resp.json()
    hourly = payload.get("hourly", {})

    times = pd.to_datetime(hourly.get("time", []))
    df = pd.DataFrame(
        {
            "ghi": hourly.get("shortwave_radiation", []),
            "dni_horiz": hourly.get("direct_radiation", []),
            "dhi": hourly.get("diffuse_radiation", []),
            "temperature_2m": hourly.get("temperature_2m", []),
            "cloud_cover": hourly.get("cloud_cover", []),
        },
        index=pd.DatetimeIndex(times).tz_localize(tz, nonexistent="shift_forward", ambiguous="NaT"),
    )

    # Convert direct-radiation-on-horizontal-surface to DNI (on plane normal to sun).
    # DNI = direct_horizontal / cos(zenith). Use pvlib for zenith.
    solpos = pvlib.solarposition.get_solarposition(df.index, lat, lon)
    cos_zen = solpos["apparent_zenith"].apply(
        lambda z: max(1e-3, math_cos_deg(z))
    )
    df["dni"] = (df["dni_horiz"] / cos_zen).clip(lower=0)
    # When sun is below horizon, force DNI to 0.
    df.loc[solpos["apparent_zenith"] >= 90, "dni"] = 0.0
    df = df.drop(columns=["dni_horiz"])

    return df


def math_cos_deg(deg: float) -> float:
    import math
    return math.cos(math.radians(deg))


def fetch_clearsky_hourly(
    lat: float,
    lon: float,
    start: date,
    end: date,
    tz: str = "America/Toronto",
    altitude_m: float = 100.0,
) -> pd.DataFrame:
    """Clear-sky GHI/DNI/DHI from pvlib's Ineichen/Perez clear-sky model.

    Used for the "what the sky gives you" theoretical curve.
    Returns DataFrame indexed by tz-aware datetime with ghi, dni, dhi columns.
    """
    times = pd.date_range(
        start=pd.Timestamp(start, tz=tz),
        end=pd.Timestamp(end + timedelta(days=1), tz=tz),
        freq="1h",
        inclusive="left",
    )
    location = pvlib.location.Location(lat, lon, tz=tz, altitude=altitude_m)
    cs = location.get_clearsky(times)
    # Returns ghi, dni, dhi already.
    cs["temperature_2m"] = 20.0  # neutral temperature for clear-sky theoretical
    return cs


def most_recent_full_year() -> tuple[date, date]:
    """Returns (start, end) for the most recent complete calendar year ending
    before today. e.g. if today is 2026-05-25, returns (2025-01-01, 2025-12-31).
    Open-Meteo archive lags real time by ~5 days so this is always safe.
    """
    today = date.today()
    year = today.year - 1
    return date(year, 1, 1), date(year, 12, 31)
