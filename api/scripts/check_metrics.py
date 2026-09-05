"""Metrics on the cleaned sample. From project root: python -m scripts.check_metrics"""

import json
from pathlib import Path

from app.cleaning.pipeline import clean
from app.metrics import (
    compute_scalars,
    period_grain,
    revenue_by_category,
    revenue_by_period,
    top_products,
)

SAMPLE = Path(__file__).resolve().parent.parent / "data" / "sample_messy.csv"

valid, _ = clean(SAMPLE.read_bytes())

print(json.dumps(compute_scalars(valid), indent=2))

grain = period_grain(valid)
print(f"\nPeriod grain: {grain}")

print("\nRevenue by period:")
print(json.dumps(revenue_by_period(valid, grain)[:3], indent=2))

print("\nTop products:")
print(json.dumps(top_products(valid)[:3], indent=2))

print("\nRevenue by category:")
print(json.dumps(revenue_by_category(valid), indent=2))