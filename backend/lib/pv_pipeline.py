"""pvlib-based PV generation pipeline.

Inputs:
  - lat, lon (decimal degrees), tz (IANA timezone string)
  - roof config: tilt, azimuth, panel count, area, efficiency, NOCT, temp coeff
  - system: inverter eff, wiring/soiling/mismatch loss
  - weather: a pandas DataFrame indexed by hour with columns
      ghi, dni, dhi, temperature_2m  (W/m^2 for irradiance, °C for temp)

Outputs:
  - hourly E_AC (kWh)
  - monthly aggregates
  - typical-day hourly profile (avg of each hour across all 365 days)
  - daily totals
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd
import pvlib


@dataclass
class RoofConfig:
    tilt_deg: float
    azimuth_deg: float
    panel_count: int
    panel_area_sqm: float
    panel_efficiency_stc: float
    panel_temp_coeff_per_c: float
    panel_noct_c: float
    inverter_efficiency: float
    loss_wiring: float
    loss_soiling: float
    loss_mismatch: float
    ground_reflectance: float

    @property
    def total_panel_area(self) -> float:
        return self.panel_count * self.panel_area_sqm

    @property
    def system_kw(self) -> float:
        # 1000 W/m^2 STC × area × η_STC, divide by 1000 for kW.
        return self.total_panel_area * self.panel_efficiency_stc

    @property
    def combined_derate(self) -> float:
        return (
            self.inverter_efficiency
            * (1 - self.loss_wiring)
            * (1 - self.loss_soiling)
            * (1 - self.loss_mismatch)
        )


def load_default_roof() -> RoofConfig:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(here, "data", "roof_defaults.json")) as f:
        d = json.load(f)
    return RoofConfig(
        tilt_deg=d["tilt_deg"],
        azimuth_deg=d["azimuth_deg"],
        panel_count=d["panel_count"],
        panel_area_sqm=d["panel_area_sqm"],
        panel_efficiency_stc=d["panel_efficiency_stc"],
        panel_temp_coeff_per_c=d["panel_temp_coeff_per_c"],
        panel_noct_c=d["panel_noct_c"],
        inverter_efficiency=d["inverter_efficiency"],
        loss_wiring=d["loss_wiring"],
        loss_soiling=d["loss_soiling"],
        loss_mismatch=d["loss_mismatch"],
        ground_reflectance=d["ground_reflectance"],
    )


def compute_hourly_generation(
    weather: pd.DataFrame,
    lat: float,
    lon: float,
    altitude_m: float,
    roof: RoofConfig,
    shadow_occlusion: Optional[np.ndarray] = None,
) -> pd.Series:
    """Run the full PV pipeline and return hourly AC generation (kWh).

    weather: DataFrame indexed by tz-aware datetime, columns: ghi, dni, dhi, temperature_2m.
    shadow_occlusion: optional length-N array in [0, 1] of fraction-shaded per hour.
                      Defaults to all zeros (no shadow) if None.
    """
    if shadow_occlusion is None:
        shadow_occlusion = np.zeros(len(weather))
    elif len(shadow_occlusion) != len(weather):
        raise ValueError(
            f"shadow_occlusion length {len(shadow_occlusion)} != weather length {len(weather)}"
        )

    # 1. Sun position
    solpos = pvlib.solarposition.get_solarposition(
        time=weather.index,
        latitude=lat,
        longitude=lon,
        altitude=altitude_m,
    )

    # 2. Plane-of-array irradiance (isotropic sky model)
    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=roof.tilt_deg,
        surface_azimuth=roof.azimuth_deg,
        solar_zenith=solpos["apparent_zenith"],
        solar_azimuth=solpos["azimuth"],
        dni=weather["dni"],
        ghi=weather["ghi"],
        dhi=weather["dhi"],
        albedo=roof.ground_reflectance,
        model="isotropic",
    )
    poa_direct = poa["poa_direct"].fillna(0).clip(lower=0)
    poa_diffuse = poa["poa_sky_diffuse"].fillna(0).clip(lower=0) + poa[
        "poa_ground_diffuse"
    ].fillna(0).clip(lower=0)

    # 3. Apply shadow occlusion to the direct beam only.
    s = pd.Series(shadow_occlusion, index=weather.index).clip(0, 1)
    poa_shaded = poa_direct * (1 - s) + poa_diffuse  # W/m^2

    # 4. Cell temperature via simple NOCT model.
    t_ambient = weather["temperature_2m"].ffill().fillna(20)
    t_cell = t_ambient + (roof.panel_noct_c - 20) / 800.0 * poa_shaded
    eta_T = roof.panel_efficiency_stc * (
        1 + roof.panel_temp_coeff_per_c * (t_cell - 25)
    )

    # 5. DC power (W) and energy (kWh) per hour.
    P_DC = poa_shaded * roof.total_panel_area * eta_T  # W
    E_DC_kwh = P_DC / 1000.0

    # 6. AC after system losses.
    E_AC_kwh = E_DC_kwh * roof.combined_derate

    return E_AC_kwh.rename("E_AC_kwh").clip(lower=0)


def aggregate_to_outputs(e_ac_kwh: pd.Series) -> dict:
    """Reduce hourly generation series into the shapes the frontend wants."""
    by_day = e_ac_kwh.resample("D").sum()
    by_month = e_ac_kwh.resample("MS").sum()
    typical_hourly = e_ac_kwh.groupby(e_ac_kwh.index.hour).mean()

    # Pad to 12 / 24 / 365 in case the input was partial.
    monthly = [0.0] * 12
    for ts, val in by_month.items():
        monthly[ts.month - 1] = float(val)

    daily = list(by_day.values.tolist())
    # ensure length-365 (some years span 366 hours-of-data on DST boundaries)
    daily = (daily + [0.0] * 365)[:365]

    typical_day = [0.0] * 24
    for h, val in typical_hourly.items():
        typical_day[int(h)] = float(val)

    return {
        "annual_kwh": float(e_ac_kwh.sum()),
        "monthly_kwh": [round(v, 1) for v in monthly],
        "daily_kwh": [round(v, 3) for v in daily],
        "typical_day_hourly_kwh": [round(v, 4) for v in typical_day],
    }
