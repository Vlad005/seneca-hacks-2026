"""POST /extract-bill — GPT-4o-mini vision bill extraction.

The bill image is sent straight to GPT-4o-mini as a multimodal message. The
model returns a strict JSON object matching the schema below. No OCR step.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from openai import OpenAI
from pydantic import BaseModel, Field

router = APIRouter(prefix="/extract-bill", tags=["extract"])
log = logging.getLogger("extract")

MAX_BYTES = 10 * 1024 * 1024
ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


class ExtractedBill(BaseModel):
    service_address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    total_kwh_this_period: Optional[float] = None
    monthly_history_kwh: Optional[list[float]] = Field(
        None,
        description="12 kWh values in the order they appear on the bill (oldest first).",
    )
    on_peak_kwh: Optional[float] = None
    mid_peak_kwh: Optional[float] = None
    off_peak_kwh: Optional[float] = None


BILL_JSON_SCHEMA = {
    "name": "ontario_hydro_bill",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "service_address": {"type": ["string", "null"]},
            "city": {"type": ["string", "null"]},
            "province": {"type": ["string", "null"]},
            "postal_code": {"type": ["string", "null"]},
            "total_kwh_this_period": {"type": ["number", "null"]},
            "monthly_history_kwh": {
                "type": ["array", "null"],
                "items": {"type": "number"},
            },
            "on_peak_kwh": {"type": ["number", "null"]},
            "mid_peak_kwh": {"type": ["number", "null"]},
            "off_peak_kwh": {"type": ["number", "null"]},
        },
        "required": [
            "service_address",
            "city",
            "province",
            "postal_code",
            "total_kwh_this_period",
            "monthly_history_kwh",
            "on_peak_kwh",
            "mid_peak_kwh",
            "off_peak_kwh",
        ],
    },
}


SYSTEM_PROMPT = """You read photos of Ontario residential electricity bills and extract structured data.

Field rules:
- service_address: the street address where electricity is DELIVERED (not the
  mailing address if they differ). Just the street + number, no city/postal.
- city: the city/town name only.
- province: always "ON" for Ontario bills.
- postal_code: Canadian format A1A 1A1 (uppercase, with the space).
- total_kwh_this_period: kWh consumed in the current billing period.
  If TOU, this is on_peak + mid_peak + off_peak. Numeric only.

- monthly_history_kwh: if the bill shows a 12-month history chart (bars or
  table), read each value precisely and return them OLDEST to NEWEST in the
  order they appear on the chart (left-to-right or top-to-bottom).
  Return null if you genuinely cannot find any history chart on the bill.
  Do not invent values. Only return what you can clearly read.

- on_peak_kwh / mid_peak_kwh / off_peak_kwh: if the bill shows a TOU usage
  breakdown for the current period (typically labeled "On-Peak", "Mid-Peak",
  "Off-Peak" with kWh values), extract each. Otherwise all three null.

- Any field you can't read confidently: return null. Do not guess.
- Return JSON matching the supplied schema exactly. No prose.
"""


@router.post("", response_model=ExtractedBill)
async def extract_bill(file: UploadFile = File(...)) -> ExtractedBill:
    if file.content_type and file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content type {file.content_type}. Send JPG/PNG/WEBP.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty upload.")
    if len(image_bytes) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(image_bytes)} bytes). Limit is {MAX_BYTES}.",
        )

    mime = file.content_type or "image/jpeg"
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime};base64,{image_b64}"

    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured.")

    client = OpenAI(api_key=openai_key)
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_schema", "json_schema": BILL_JSON_SCHEMA},
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract the structured fields from this Ontario hydro bill.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url, "detail": "high"},
                        },
                    ],
                },
            ],
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"OpenAI call failed: {e}")

    content = completion.choices[0].message.content or "{}"
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Model returned non-JSON: {e}. Raw: {content[:300]}",
        )

    log.info("extract: response = %s", json.dumps(parsed)[:1500])
    return ExtractedBill(**parsed)
