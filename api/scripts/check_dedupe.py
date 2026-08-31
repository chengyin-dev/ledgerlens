"""Manual check of deduplication. Run from api/: python -m scripts.check_dedupe"""

import pandas as pd

from app.cleaning.pipeline import deduplicate 

frame = pd.DataFrame(
    [
         {"order_id": "INV-1", "product": "Blue Mug", "order_date": "2024-01-01", "customer_name": "Marcus Lee"},
        {"order_id": "INV-1", "product": "Blue Mug", "order_date": "2024-01-01", "customer_name": "Marcus Lee"},
        {"order_id": "INV-2", "product": "Wooden Tray", "order_date": "2024-02-02", "customer_name": "Grace Wong"},
        {"order_id": "INV-2", "product": "Wooden Tray", "order_date": "2024-02-02", "customer_name": "GRACE WONG"},
        {"order_id": "INV-3", "product": "Filter Papers", "order_date": "2024-03-03", "customer_name": "Kevin Tan"},
    ]
)

result, exact, key = deduplicate(frame) 

print(f"Exact duplicates removed: {exact}")
print(f"Key duplicates removed:   {key}")
print(f"Rows remaining:           {len(result)}")
print(f"Index preserved:          {list(result.index)}")
print(result)