"""Generate a deliberately messy sales CSV for testing the cleaning pipeline.

Run from the api/ directory:
    python scripts/generate_sample.py

Writes data/sample_messy.csv and prints a report of the defects planted.
"""

from __future__ import annotations

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

SEED = 42
BASE_ROW_COUNT = 1200
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_messy.csv"

# (product, category, typical unit price)
PRODUCTS = [
    ("Blue Mug", "Drinkware", 12.50),
    ("Travel Tumbler", "Drinkware", 28.00),
    ("Glass Carafe", "Drinkware", 34.90),
    ("Espresso Machine", "Appliances", 1450.00),
    ("Milk Frother", "Appliances", 89.00),
    ("Burr Grinder", "Appliances", 320.00),
    ("Linen Apron", "Apparel", 45.00),
    ("Cotton Tote", "Apparel", 18.00),
    ("Bean Sampler Box", "Consumables", 62.00),
    ("House Blend 1kg", "Consumables", 41.50),
    ("Filter Papers", "Consumables", 7.25),
    ("Wooden Tray", "Homeware", 76.00),
]

CUSTOMERS = [
    "Aisha Rahman", "Daniel Ong", "Priya Nair", "Marcus Lee",
    "Siti Nurhaliza", "Kevin Tan", "Grace Wong", "Arjun Menon",
    "Chloe Lim", "Farid Hassan", "Nadia Ismail", "Ryan Cheah",
]

# Header names as they appear in the file. Deliberately not the canonical
# field names - this exercises the alias resolution in blueprint 5.2.
HEADER_ALIASES = {
    "order_id": "Order No.",
    "order_date": " DATE ",
    "customer_name": "Customer",
    "product": "Item Name",
    "category": "Dept",
    "quantity": "QTY",
    "unit_price": "Price",
    "line_total": "Total",
}

DATE_STYLES = ["%d/%m/%Y", "%m-%d-%Y", "%d %b %Y", "%Y/%m/%d"]

BROKEN_DATES = ["31/02/2024", "Feb 30 2024", "n/a", "TBC", "0000-00-00"]


def _pick(rng: random.Random, rows: list[dict], share: float) -> list[dict]:
    """Return a random subset of rows, sized as a share of the total."""
    count = max(1, int(len(rows) * share))
    return rng.sample(rows, count)


def make_base_rows(rng: random.Random, n: int) -> list[dict]:
    """Build clean, well-formed rows. Defects are applied afterwards."""
    rows = []
    start = datetime(2024, 1, 1)

    for i in range(n):
        product, category, base_price = rng.choice(PRODUCTS)
        price = round(base_price * rng.uniform(0.9, 1.1), 2)
        quantity = rng.randint(1, 12)
        sold_on = start + timedelta(days=rng.randint(0, 364))

        rows.append(
            {
                "order_id": f"INV-{10000 + i}",
                "order_date": sold_on.strftime("%Y-%m-%d"),
                "customer_name": rng.choice(CUSTOMERS),
                "product": product,
                "category": category,
                "quantity": str(quantity),
                "unit_price": f"{price:.2f}",
                "line_total": f"{quantity * price:.2f}",
            }
        )

    return rows


def defect_whitespace(rng: random.Random, rows: list[dict]) -> int:
    """Pad text fields with stray spaces, as copy-paste from email tends to."""
    affected = _pick(rng, rows, 0.18)
    for row in affected:
        field = rng.choice(["customer_name", "product", "category"])
        row[field] = f"  {row[field]} "
    return len(affected)

def defect_bad_quantity(rng: random.Random, rows: list[dict]) -> int:
    """Replace some quantities with text that isn't a number."""
    affected = _pick(rng, rows, 0.02)
    for row in affected:
        row["quantity"] = rng.choice(["two", "N/A", "-", "unknown"])
    return len(affected)



def defect_casing(rng: random.Random, rows: list[dict]) -> int:
    """Vary casing so the same product appears as several distinct values."""
    affected = _pick(rng, rows, 0.14)
    for row in affected:
        style = rng.choice(["lower", "upper", "category_upper"])
        if style == "lower":
            row["product"] = row["product"].lower()
        elif style == "upper":
            row["product"] = row["product"].upper()
        else:
            row["category"] = row["category"].upper()
    return len(affected)


def defect_currency_noise(rng: random.Random, rows: list[dict]) -> int:
    """Put currency symbols and thousands separators inside numeric columns."""
    affected = _pick(rng, rows, 0.16)
    for row in affected:
        style = rng.choice(["symbol", "symbol_space", "thousands"])
        if style == "symbol":
            row["unit_price"] = f"${row['unit_price']}"
        elif style == "symbol_space":
            row["unit_price"] = f"$ {row['unit_price']}"
        else:
            row["line_total"] = f"{float(row['line_total']):,.2f}"
    return len(affected)


def defect_date_formats(rng: random.Random, rows: list[dict]) -> int:
    """Rewrite valid dates into a mix of regional and written formats."""
    affected = _pick(rng, rows, 0.24)
    for row in affected:
        parsed = datetime.strptime(row["order_date"], "%Y-%m-%d")
        row["order_date"] = parsed.strftime(rng.choice(DATE_STYLES))
    return len(affected)


def defect_broken_dates(rng: random.Random, rows: list[dict]) -> int:
    """Insert dates that cannot be salvaged. These should be rejected."""
    affected = _pick(rng, rows, 0.015)
    for row in affected:
        row["order_date"] = rng.choice(BROKEN_DATES)
    return len(affected)


def defect_missing_required(rng: random.Random, rows: list[dict]) -> int:
    """Blank out a required field. These should be rejected."""
    affected = _pick(rng, rows, 0.03)
    for row in affected:
        field = rng.choice(["product", "quantity", "order_id", "unit_price"])
        row[field] = ""
    return len(affected)


def defect_duplicates(rng: random.Random, rows: list[dict]) -> int:
    """Append exact duplicates and near-duplicates that differ only by casing.

    Exact duplicates should be caught by full-row deduplication; the
    near-duplicates should only be caught by key-based deduplication on
    (order_id, product, order_date).
    """
    exact = [dict(row) for row in rng.sample(rows, 40)]

    near = []
    for row in rng.sample(rows, 25):
        clone = dict(row)
        clone["customer_name"] = clone["customer_name"].upper()
        near.append(clone)

    rows.extend(exact + near)
    rng.shuffle(rows)
    return len(exact) + len(near)


DEFECTS = [
    ("Whitespace padding on text fields", defect_whitespace),
    ("Inconsistent casing on product/category", defect_casing),
    ("Currency symbols and thousands separators", defect_currency_noise),
    ("Mixed regional date formats", defect_date_formats),
    ("Unparseable dates", defect_broken_dates),
    ("Missing required fields", defect_missing_required),
    ("Non-numeric quantity values", defect_bad_quantity),
    ("Duplicate and near-duplicate rows", defect_duplicates),
]


def write_csv(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = list(HEADER_ALIASES.keys())

    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([HEADER_ALIASES[field] for field in fields])
        for row in rows:
            writer.writerow([row[field] for field in fields])


def main() -> None:
    rng = random.Random(SEED)
    rows = make_base_rows(rng, BASE_ROW_COUNT)

    planted = []
    for label, apply_defect in DEFECTS:
        planted.append((label, apply_defect(rng, rows)))

    write_csv(rows, OUTPUT_PATH)

    print(f"Wrote {len(rows)} rows to {OUTPUT_PATH}")
    print(f"Headers written as aliases: {list(HEADER_ALIASES.values())}")
    print("\nDefects planted:")
    for label, count in planted:
        print(f"  {count:>5}  {label}")


if __name__ == "__main__":
    main()