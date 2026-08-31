"""The columns LedgerLens expects, and the header names that map onto them."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

REQUIRED_FIELDS = ["order_id", "order_date", "product", "quantity", "unit_price"]
OPTIONAL_FIELDS = ["customer_name", "category", "line_total"]
ALL_FIELDS = REQUIRED_FIELDS + OPTIONAL_FIELDS

# Maps a normalised incoming header to the field it represents.
HEADER_ALIASES: dict[str, str] = {
    "order_id": "order_id",
    "orderid": "order_id",
    "order_no": "order_id",
    "order_number": "order_id",
    "invoice": "order_id",
    "invoice_no": "order_id",

    "order_date": "order_date",
    "date": "order_date",
    "order_dt": "order_date",
    "transaction_date": "order_date",
    "sold_on": "order_date",

    "customer_name": "customer_name",
    "customer": "customer_name",
    "client": "customer_name",
    "buyer": "customer_name",

    "product": "product",
    "product_name": "product",
    "item": "product",
    "item_name": "product",
    "sku_name": "product",

    "category": "category",
    "product_category": "category",
    "type": "category",
    "dept": "category",

    "quantity": "quantity",
    "qty": "quantity",
    "units": "quantity",
    "count": "quantity",

    "unit_price": "unit_price",
    "unitprice": "unit_price",
    "price": "unit_price",
    "rate": "unit_price",
    "amount_each": "unit_price",

    "line_total": "line_total",
    "total": "line_total",
    "amount": "line_total",
    "subtotal": "line_total",
    "revenue": "line_total",
}


@dataclass
class ResolvedHeaders:
    """The outcome of matching a file's headers against the expected schema."""

    rename_map: dict[str, str] = field(default_factory=dict)
    dropped_columns: list[str] = field(default_factory=list)
    missing_required: list[str] = field(default_factory=list)


def normalise_header(raw: str) -> str:
    """Reduce a header to a comparable form: 'Order No.' -> 'order_no'."""
    lowered = raw.strip().lower()
    collapsed = re.sub(r"[^a-z0-9]+", "_", lowered)
    return collapsed.strip("_")


def resolve_headers(columns: list[str]) -> ResolvedHeaders:
    """Match a file's headers to expected fields, reporting what didn't match."""
    result = ResolvedHeaders()
    claimed: set[str] = set()

    for original in columns:
        field_name = HEADER_ALIASES.get(normalise_header(original))

        if field_name is None or field_name in claimed:
            result.dropped_columns.append(original)
            continue

        result.rename_map[original] = field_name
        claimed.add(field_name)

    result.missing_required = [f for f in REQUIRED_FIELDS if f not in claimed]
    return result