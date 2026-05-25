"""POST /pv-analysis — full solar generation report for a roof.

Inputs: lat/lon + optional roof overrides + optional shadow occlusion array.
Outputs: theoretical vs actual generation (annual, monthly, daily, typical day).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from lib.pv_pipeline import (
    RoofConfig,
    aggregate_to_outputs,
    compute_hourly_generation,
    load_default_roof,
)
from lib.weather import (
    fetch_clearsky_hourly,
    fetch_open_meteo_hourly,
    most_recent_full_year,
)

router = APIRouter(prefix="/pv-analysis", tags=["solar"])
log = logging.getLogger("pv-analysis")


class RoofOverride(BaseModel):
    tilt_deg: Optional[float] = None
    azimuth_deg: Optional[float] = None
    panel_count: Optional[int] = None
    panel_area_sqm: Optional[float] = None
    panel_efficiency_stc: Optional[float] = None


class PvAnalysisRequest(BaseModel):
    lat: float = Field(..., description="Latitude in decimal degrees.")
    lon: float = Field(..., description="Longitude in decimal degrees.")
    altitude_m: float = Field(100.0, description="Site elevation in meters.")
    tz: str = Field("America/Toronto", description="IANA timezone name.")
    roof: Optional[RoofOverride] = None
    shadow_occlusion: Optional[list[float]] = Field(
        None,
        description="Length-8760 (or matching weather frame) array, [0,1] fraction-shaded per hour. Defaults to no shadow.",
    )


class PvAnalysisResponse(BaseModel):
    system_kw: float
    panel_count: int
    usable_area_sqm: float
    tilt_deg: float
    azimuth_deg: float

    theoretical: dict
    actual: dict

    avg_realization_pct: float
    monthly_generation_kwh: list[float]
    typical_day_hourly_kwh: list[float]
    annual_kwh: float


def _resolved_roof(override: Optional[RoofOverride]) -> RoofConfig:
    cfg = load_default_roof()
    if override:
        if override.tilt_deg is not None:
            cfg.tilt_deg = override.tilt_deg
        if override.azimuth_deg is not None:
            cfg.azimuth_deg = override.azimuth_deg
        if override.panel_count is not None:
            cfg.panel_count = override.panel_count
        if override.panel_area_sqm is not None:
            cfg.panel_area_sqm = override.panel_area_sqm
        if override.panel_efficiency_stc is not None:
            cfg.panel_efficiency_stc = override.panel_efficiency_stc
    return cfg


@router.post("", response_model=PvAnalysisResponse)
async def pv_analysis(req: PvAnalysisRequest) -> PvAnalysisResponse:
    roof = _resolved_roof(req.roof)
    start, end = most_recent_full_year()

    try:
        # Open-Meteo is the blocking call; offload to a thread.
        actual_weather = await asyncio.to_thread(
            fetch_open_meteo_hourly,
            req.lat,
            req.lon,
            start,
            end,
            req.tz,
        )
    except Exception as e:  # noqa: BLE001
        log.exception("Open-Meteo fetch failed")
        raise HTTPException(status_code=502, detail=f"Weather fetch failed: {e}")

    clearsky_weather = await asyncio.to_thread(
        fetch_clearsky_hourly,
        req.lat,
        req.lon,
        start,
        end,
        req.tz,
        req.altitude_m,
    )

    occlusion = np.array(req.shadow_occlusion) if req.shadow_occlusion else None
    if occlusion is not None and len(occlusion) != len(actual_weather):
        # Truncate or pad; if user passed 8760 but DST gave us 8784, we trim.
        if len(occlusion) > len(actual_weather):
            occlusion = occlusion[: len(actual_weather)]
        else:
            pad = np.zeros(len(actual_weather) - len(occlusion))
            occlusion = np.concatenate([occlusion, pad])

    actual_gen = compute_hourly_generation(
        actual_weather, req.lat, req.lon, req.altitude_m, roof, occlusion
    )
    theoretical_gen = compute_hourly_generation(
        clearsky_weather,
        req.lat,
        req.lon,
        req.altitude_m,
        roof,
        shadow_occlusion=None,
    )

    actual_agg = aggregate_to_outputs(actual_gen)
    theoretical_agg = aggregate_to_outputs(theoretical_gen)

    avg_realization = (
        100.0 * actual_agg["annual_kwh"] / theoretical_agg["annual_kwh"]
        if theoretical_agg["annual_kwh"] > 0
        else 0.0
    )

    return PvAnalysisResponse(
        system_kw=round(roof.system_kw, 2),
        panel_count=roof.panel_count,
        usable_area_sqm=round(roof.total_panel_area, 1),
        tilt_deg=roof.tilt_deg,
        azimuth_deg=roof.azimuth_deg,
        theoretical=theoretical_agg,
        actual=actual_agg,
        avg_realization_pct=round(avg_realization, 1),
        monthly_generation_kwh=actual_agg["monthly_kwh"],
        typical_day_hourly_kwh=actual_agg["typical_day_hourly_kwh"],
        annual_kwh=round(actual_agg["annual_kwh"], 1),
    )
