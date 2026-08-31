"""Quick manual check of the loading step. Run from api/: python scripts/check_load.py"""

from pathlib import Path

from app.cleaning.pipeline import load_dataframe

SAMPLE = Path(__file__).resolve().parent.parent / "data" / "sample_messy.csv"

frame, resolved = load_dataframe(SAMPLE.read_bytes())

print(f"Rows: {len(frame)}")
print(f"Columns: {list(frame.columns)}")
print(f"Dropped: {resolved.dropped_columns}")
print(f"Header mapping: {resolved.rename_map}")
print("\nFirst 5 rows:")
print(frame.head())
print("\nColumn types:")
print(frame.dtypes)