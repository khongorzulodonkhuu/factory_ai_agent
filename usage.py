"""Token and dollar accounting for one or more model responses."""

from config import PRICES


def measure(model: str, usage_metadata: list[dict]) -> dict:
    """Sum LangChain usage_metadata dicts into tokens, cache reads and dollars."""
    price_in, price_out = PRICES.get(model.split(":", 1)[-1], (0.0, 0.0))
    tokens = cached = 0
    usd = 0.0
    for u in usage_metadata:
        details = u.get("input_token_details") or {}
        read, write = details.get("cache_read", 0) or 0, details.get("cache_creation", 0) or 0
        fresh = u.get("input_tokens", 0) - read - write
        usd += (fresh * price_in + read * price_in * 0.1 + write * price_in * 1.25
                + u.get("output_tokens", 0) * price_out) / 1_000_000
        tokens += u.get("total_tokens", 0)
        cached += read
    return {"tokens": tokens, "cached": cached, "usd": round(usd, 4)}
