"""Compute sales metrics from cleaned rows"""

from __future__ import annotations

import pandas as pd

SHORT_RANGE_DAYS = 60
TOP_PRODUCT_LIMIT = 10


def _round(value: float) -> float:
    """Round to cents and return a plain float for JSON storage"""
    return float(round(value, 2))


def compute_scalars(frame: pd.DataFrame) -> dict:
    """Headline figures for the dashboard cards"""
    if frame.empty:
        return {
            "total_revenue": 0.0,
            "total_orders": 0,
            "total_units": 0,
            "avg_order_value": 0.0,
            "unique_products": 0,
            "date_range": {"start": None, "end": None},
        }

    total_revenue = float(frame["line_total"].sum())
    total_orders = int(frame["order_id"].nunique())
    total_units = int(frame["quantity"].sum())

    return {
        "total_revenue": _round(total_revenue),
        "total_orders": total_orders,
        "total_units": total_units,
        "avg_order_value": _round(total_revenue / total_orders)
        if total_orders
        else 0.0,
        "unique_products": int(frame["product"].nunique()),
        "date_range": {
            "start": frame["order_date"].min().date().isoformat(),
            "end": frame["order_date"].max().date().isoformat(),
        },
    }


def period_grain(frame: pd.DataFrame) -> str:
    """Choose day or month buckets based on how much time the data spans"""
    if frame.empty:
        return "month"

    span = frame["order_date"].max() - frame["order_date"].min()
    return "day" if span.days < SHORT_RANGE_DAYS else "month"


def revenue_by_period(frame: pd.DataFrame, grain: str) -> list[dict]:
    """Revenue and order count per time bucket, oldest first"""
    if frame.empty:
        return []

    result = frame.copy()

    if grain == "day":
        result["period"] = result["order_date"].dt.date
    elif grain == "month":
        result["period"] = result["order_date"].dt.to_period("M").astype(str)
    else:
        raise ValueError(f"Unsupported grain: {grain}")

    result = (
        result.groupby("period")
        .agg(
            revenue=("line_total", "sum"),
            orders=("order_id", "nunique"),
        )
        .reset_index()
        .sort_values("period")
    )

    result["revenue"] = result["revenue"].round(2).astype(float)
    result["orders"] = result["orders"].astype(int)

    return result.to_dict(orient="records")


def top_products(frame: pd.DataFrame) -> list[dict]:
    """The ten highest-revenue products"""
    if frame.empty:
        return []

    result = (
        frame.groupby("product")
        .agg(
            revenue=("line_total", "sum"),
            units=("quantity", "sum"),
        )
        .reset_index()
        .sort_values("revenue", ascending=False)
        .head(TOP_PRODUCT_LIMIT)
    )

    result["revenue"] = result["revenue"].round(2).astype(float)
    result["units"] = result["units"].astype(int)

    return result.to_dict(orient="records")


def revenue_by_category(frame: pd.DataFrame) -> list[dict]:
    """Revenue per category with each one's share of the total"""
    if frame.empty or "category" not in frame.columns:
        return []

    result = frame.copy()
    result["category"] = (
        result["category"]
        .astype(str)
        .str.strip()
        .replace("", "Uncategorised")
    )

    result = (
        result.groupby("category")
        .agg(revenue=("line_total", "sum"))
        .reset_index()
        .sort_values("revenue", ascending=False)
    )

    total_revenue = float(result["revenue"].sum())

    result["revenue"] = result["revenue"].round(2).astype(float)
    result["share"] = (
        (result["revenue"] / total_revenue * 100).round(2)
        if total_revenue
        else 0.0
    )
    result["share"] = result["share"].astype(float)

    return result.to_dict(orient="records")