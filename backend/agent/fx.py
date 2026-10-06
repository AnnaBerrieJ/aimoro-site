"""CNY -> USD exchange rate, cached for a few hours.

Falls back to DEFAULT_CNY_USD (env) if the rate API is unreachable.
Each quote stores the rate it used, so later changes don't affect it.
"""
import os
import time

import httpx

RATE_URL = "https://open.er-api.com/v6/latest/CNY"
CACHE_SECONDS = 6 * 3600
_cache: dict = {"rate": None, "at": 0.0, "source": "fallback"}


def fallback_rate() -> float:
    return float(os.getenv("DEFAULT_CNY_USD", "0.14"))


def get_cny_usd() -> dict:
    now = time.time()
    if _cache["rate"] and now - _cache["at"] < CACHE_SECONDS:
        return {"rate": _cache["rate"], "source": _cache["source"]}
    try:
        resp = httpx.get(RATE_URL, timeout=5)
        resp.raise_for_status()
        rate = float(resp.json()["rates"]["USD"])
        _cache.update(rate=rate, at=now, source="open.er-api.com")
    except Exception:
        return {"rate": fallback_rate(), "source": "fallback"}
    return {"rate": _cache["rate"], "source": _cache["source"]}
