""""Run the full pipeline on the sample. From api/: python -m scripts.check_clean"""

import json
from pathlib import Path 

from app.cleaning.pipeline import clean 

SAMPLE = Path(__file__).resolve().parent.parent / "data" / "sample_messy.csv"

valid, report = clean(SAMPLE.read_bytes())

print(json.dumps(report, indent = 2, default = str))
print("\nFirst 5 clean rows:")
print(valid.head())
print("\nColumn types:")
print(valid.dtypes)