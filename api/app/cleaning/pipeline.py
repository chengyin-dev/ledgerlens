"""Ordered cleaning steps. Raw file bytes in, cleaned data and a report out."""

from __future__ import annotations

import io

import pandas as pd

from app.cleaning.schema_map import ResolvedHeaders, resolve_headers
from app.cleaning.coercion import normalise_case, parse_dates, strip_numeric_noise, to_numeric, trim_strings


class SchemaError(ValueError):
    """Raised when required columns cannot be found in the uploaded file."""

    def __init__(self, missing: list[str], found: list[str]) -> None:
        self.missing = missing
        self.found = found
        super().__init__(
            f"Missing required columns: {', '.join(missing)}. "
            f"Columns found in file: {', '.join(found)}."
        )


def decode_bytes(raw: bytes) -> str:
    """Decode file bytes, falling back to latin-1 when UTF-8 fails."""
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return raw.decode("latin-1")


def load_dataframe(raw: bytes) -> tuple[pd.DataFrame, ResolvedHeaders]:
    """Read a CSV into a DataFrame with expected column names.

    Every value is read as text. Interpreting text as numbers or dates is the
    job of later steps, which can report what they could not interpret.
    """
    text = decode_bytes(raw)

    frame = pd.read_csv(
        io.StringIO(text),
        dtype=str,
        keep_default_na=False,
        skip_blank_lines=True,
    )

    resolved = resolve_headers(list(frame.columns))

    if resolved.missing_required:
        raise SchemaError(resolved.missing_required, list(frame.columns))

    frame = frame.rename(columns=resolved.rename_map)
    frame = frame[list(resolved.rename_map.values())]

    return frame, resolved


DUPLICATE_KEY = ["order_id", "product", "order_date"]

def deduplicate(frame: pd.DataFrame) -> tuple[pd.DataFrame, int, int]:
    """Remove exact duplicate rows, then rows repeating an order key.

    Returns the reduced frame, the number of exact duplicates removed, and
    the number of key duplicates removed.
    """
    exact_mask = frame.duplicated(keep = "first")
    exact_count = int(exact_mask.sum())
    frame = frame[~exact_mask]

    key_mask = frame.duplicated(subset = DUPLICATE_KEY, keep = "first")
    key_count = int(key_mask.sum())
    frame = frame[~key_mask]

    return frame, exact_count, key_count

REQUIRED_FIELDS = ["order_id", "order_date", "product", "quantity", "unit_price"]
TOTAL_TOLERANCE = 0.01


def validate_rows(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """Split rows into those that can be trusted and those that cannot.

    Returns the valid rows, the rejected rows, and counts per rejection reason.
    """
    missing_mask = frame[REQUIRED_FIELDS].isna().any(axis=1)

    text_fields = [f for f in ["order_id", "product"] if f in frame.columns]
    for field in text_fields:
        missing_mask = missing_mask | (
            frame[field].astype(str).str.strip() == ""
        )

    invalid_range_mask = (
        (frame["quantity"] <= 0) | (frame["unit_price"] < 0)
    ).fillna(False)

    rejection_mask = missing_mask | invalid_range_mask

    rejected = frame[rejection_mask].copy()
    valid = frame[~rejection_mask].copy()

    return valid, rejected, {
        "missing_required": int(missing_mask.sum()),
        "invalid_range": int(invalid_range_mask.sum()),
    }


def recompute_totals(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Set line_total to quantity * unit_price, flagging supplied disagreements.

    Returns the frame with corrected totals, and a True/False column marking
    rows whose supplied total disagreed with the computed one.
    """
    computed_total = frame["quantity"] * frame["unit_price"]

    if "line_total" in frame.columns:
        mismatch_mask = (   
            (frame["line_total"] - computed_total).abs() > TOTAL_TOLERANCE
        ).fillna(False)
    else:
        mismatch_mask = pd.Series(False, index = frame.index, dtype = bool)

    frame = frame.copy()
    frame["line_total"] = computed_total 

    return frame, mismatch_mask 


CORRECTION_LABELS = {
    "whitespace_trimmed": "Whitespace removed from text fields",
    "case_normalised": "Product and category casing unified",
    "numeric_cleaned": "Currency symbols or separators removed from numbers",
    "duplicate_exact": "Exact duplicate rows removed",
    "duplicate_key": "Repeated order/product/date rows removed",
    "total_mismatch": "Supplied total disagreed with quantity x price",
}

REJECTION_LABELS = {
    "unparseable_date": "Date could not be interpreted",
    "non_numeric_quantity": "Quantity was not a number",
    "non_numeric_price": "Price was not a number",
    "missing_required": "A required field was empty",
    "invalid_range": "Quantity or price outside the valid range",
}

REJECTED_SAMPLE_LIMIT = 25
CASE_COLUMNS = ["product", "category"]
NUMERIC_COLUMNS = ["quantity", "unit_price", "line_total"]

def _labelled(codes: dict[str, int], labels: dict[str,str]) -> list[dict]:
    """Turn {code: count} into report entries, dropping zero counts"""
    return [
        {"code": code, "label": labels[code], "count": count}
        for code, count in codes.items()
        if count > 0
    ]

def _rejected_sample(rejected: pd.DataFrame, raw: pd.DataFrame) -> list[dict]:
    """Show the original text of rejected rows, not the coerced version."""
    sample = []
    for index in list(rejected.index)[:REJECTED_SAMPLE_LIMIT]:
        original = raw.loc[index]
        sample.append(
            {
                "row_number": int(index) + 2,
                "raw": {
                    field: str(original.get(field, ""))
                    for field in REQUIRED_FIELDS
                },
            }
        )
    return sample


def clean(raw_bytes: bytes) -> tuple[pd.DataFrame, dict]:
    """Run the full cleaning pipeline. Returns cleaned rows and a report."""
    frame, resolved = load_dataframe(raw_bytes)
    raw_text = frame.copy()
    row_count_raw = len(frame)

    frame = trim_strings(frame)
    whitespace_fixed = int((raw_text != frame).any(axis=1).sum())

    before_case = frame.copy()
    frame = normalise_case(frame, CASE_COLUMNS)
    case_fixed = int((before_case != frame).any(axis=1).sum())

    numeric_cleaned = 0
    numeric_failures: dict[str, int] = {}
    for column in NUMERIC_COLUMNS:
        if column not in frame.columns:
            continue
        text_before = frame[column]
        numbers, failed = to_numeric(text_before)
        cleaned_text = strip_numeric_noise(text_before)
        numeric_cleaned += int((text_before.str.strip() != cleaned_text).sum())
        numeric_failures[column] = int(failed.sum())
        frame[column] = numbers

    dates, date_failed = parse_dates(frame["order_date"])
    frame["order_date"] = dates
    unparseable_dates = int(date_failed.sum())

    frame, exact_dupes, key_dupes = deduplicate(frame)
    valid, rejected, rejection_counts = validate_rows(frame)
    valid, mismatched = recompute_totals(valid)

    valid = valid.copy()
    valid["issues"] = [
        ["total_mismatch"] if flag else [] for flag in mismatched
    ]

    corrections = _labelled(
        {
            "whitespace_trimmed": whitespace_fixed,
            "case_normalised": case_fixed,
            "numeric_cleaned": numeric_cleaned,
            "duplicate_exact": exact_dupes,
            "duplicate_key": key_dupes,
            "total_mismatch": int(mismatched.sum()),
        },
        CORRECTION_LABELS,
    )

    rejections = _labelled(
        {
            "unparseable_date": unparseable_dates,
            "non_numeric_quantity": numeric_failures.get("quantity", 0),
            "non_numeric_price": numeric_failures.get("unit_price", 0),
            "missing_required": rejection_counts["missing_required"],
            "invalid_range": rejection_counts["invalid_range"],
        },
        REJECTION_LABELS,
    )

    row_count_clean = len(valid)
    quality = round(row_count_clean / row_count_raw * 100, 2) if row_count_raw else 0.0

    report = {
        "row_count_raw": row_count_raw,
        "row_count_clean": row_count_clean,
        "row_count_rejected": row_count_raw - row_count_clean,
        "quality_score": quality,
        "dropped_columns": resolved.dropped_columns,
        "corrections": corrections,
        "rejections": rejections,
        "rejected_sample": _rejected_sample(rejected, raw_text),
    }

    return valid, report