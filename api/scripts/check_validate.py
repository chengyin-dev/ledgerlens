"""Manual check of validation and total recomputation.
Run from api/: python -m scripts.check_validate"""

import pandas as pd

from app.cleaning.pipeline import recompute_totals, validate_rows

frame = pd.DataFrame(
    [
        {"order_id": "INV-1", "order_date": pd.Timestamp("2024-01-01"), "product": "Blue Mug",
         "quantity": 3.0, "unit_price": 12.50, "line_total": 37.50},
        {"order_id": "INV-2", "order_date": pd.Timestamp("2024-01-02"), "product": "Wooden Tray",
         "quantity": 2.0, "unit_price": 76.00, "line_total": 999.00},
        {"order_id": "INV-2-UNDER", "order_date": pd.Timestamp("2024-01-02"), "product": "Wooden Tray",
        "quantity": 2.0, "unit_price": 76.00, "line_total": 100.00},
        {"order_id": "INV-3", "order_date": pd.Timestamp("2024-01-03"), "product": "Filter Papers",
         "quantity": float("nan"), "unit_price": 7.25, "line_total": 21.75},
        {"order_id": "INV-4", "order_date": pd.NaT, "product": "Linen Apron",
         "quantity": 1.0, "unit_price": 45.00, "line_total": 45.00},
        {"order_id": "INV-5", "order_date": pd.Timestamp("2024-01-05"), "product": "Cotton Tote",
         "quantity": 0.0, "unit_price": 18.00, "line_total": 0.00},
        {"order_id": "INV-6", "order_date": pd.Timestamp("2024-01-06"), "product": "Glass Carafe",
         "quantity": 4.0, "unit_price": -34.90, "line_total": -139.60},
    ]
)

valid, rejected, counts = validate_rows(frame)
print(f"Rejection counts: {counts}")
print(f"Valid rows:    {len(valid)}  index {list(valid.index)}")
print(f"Rejected rows: {len(rejected)}  index {list(rejected.index)}")

valid, mismatched = recompute_totals(valid)
print(f"\nTotal mismatches: {mismatched.sum()}")
print(valid[["order_id", "quantity", "unit_price", "line_total"]])