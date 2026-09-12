"""Dataset upload and retrieval endpoints."""

from __future__ import annotations

import uuid 
from datetime import datetime, timezone 
from decimal import Decimal
from pathlib import PureWindowsPath 

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cleaning.pipeline import SchemaError, clean
from app.config import (
    DEFAULT_CURRENCY, 
    MAX_ROWS, 
    MAX_UPLOAD_BYTES,
    SAMPLE_CSV_PATH,
)
from app.db import get_db
from app.metrics import (
    compute_scalars,
    period_grain,
    revenue_by_category,
    revenue_by_period,
    top_products,
)
from app.models import Dataset, SaleRow
from app.schemas import DatasetDetail, DatasetSummary 

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


def build_metrics(frame: pd.DataFrame) -> dict:
    """Assemble every metric into the stored JSON shape."""
    grain = period_grain(frame)
    metrics = compute_scalars(frame)
    metrics["period_grain"] = grain
    metrics["revenue_by_period"] = revenue_by_period(frame, grain)
    metrics["top_products"] = top_products(frame)
    metrics["revenue_by_category"] = revenue_by_category(frame)
    return metrics


def persist(
    db: Session, name: str, source: str, frame: pd.DataFrame, report: dict
) -> Dataset:
    """Write the dataset and its rows in one transaction."""
    dataset = Dataset(
        name=name,
        source=source,
        currency=DEFAULT_CURRENCY,
        row_count_raw=report["row_count_raw"],
        row_count_clean=report["row_count_clean"],
        quality_score=Decimal(str(report["quality_score"])),
        cleaning_report=report,
        metrics=build_metrics(frame),
    )

    db.add(dataset)
    db.flush()

    rows = [
        SaleRow(
            dataset_id=dataset.id,
            order_id=str(record["order_id"]),
            order_date=record["order_date"].date(),
            customer_name=record.get("customer_name") or None,
            product=str(record["product"]),
            category=record.get("category") or None,
            quantity=int(record["quantity"]),
            unit_price=Decimal(str(round(record["unit_price"], 2))),
            line_total=Decimal(str(round(record["line_total"], 2))),
            issues=record["issues"],
        )
        for record in frame.to_dict(orient="records")
    ]

    db.bulk_save_objects(rows)
    db.commit()
    db.refresh(dataset)
    return dataset


def process(db: Session, name: str, source: str, raw: bytes) -> Dataset:
    """Run the pipeline over raw bytes and store the result."""
    if not raw:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail = "The upload file is empty"
        )


    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.",
        )

    try:
        frame, report = clean(raw)
    except SchemaError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"The file could not be read as CSV: {error}",
        ) from error

    if report["row_count_raw"] > MAX_ROWS:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File has {report['row_count_raw']} rows; the limit is {MAX_ROWS}.",
        )

    return persist(db, name, source, frame, report)


@router.post("/upload", response_model=DatasetDetail, status_code=status.HTTP_201_CREATED)
def upload_dataset(
    file: UploadFile = File(...), db: Session = Depends(get_db)
) -> Dataset:
    """Accept a CSV, clean it, and store the results."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Only .csv files are accepted."
        )

    name = PureWindowsPath(file.filename).name
    return process(db, name, "upload", file.file.read())


@router.post("/sample", response_model=DatasetDetail, status_code = status.HTTP_201_CREATED)
def load_sample(db: Session = Depends(get_db)) -> Dataset:
    """Run the bundled messy sample through the same pipeline as an upload"""
    if not SAMPLE_CSV_PATH.exists():
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = "Sample data is missing from this deployment",
        )
    return process(db, "Sample data", "sample", SAMPLE_CSV_PATH.read_bytes())

@router.get("", response_model=list[DatasetSummary])
def list_datasets(db: Session = Depends(get_db)) -> list[Dataset]:
    """Every dataset that has not been deleted, newest first."""
    stmt = (
        select(Dataset)
        .where(Dataset.deleted_at.is_(None))
        .order_by(Dataset.uploaded_at.desc())
    )
    return db.execute(stmt).scalars().all()


@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(
    dataset_id: uuid.UUID, db: Session = Depends(get_db)
) -> Dataset:
    """One dataset with its full report and metrics"""
    stmt = (
        select(Dataset)
        .where(
            Dataset.id == dataset_id,
            Dataset.deleted_at.is_(None),
        )
    )

    dataset = db.execute(stmt).scalar_one_or_none()

    if dataset is None:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail = "Dataset not found",
        )

    return dataset


@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_dataset(
    dataset_id: uuid.UUID, db: Session = Depends(get_db)
) -> None:
    """Soft delete: mark it deleted without removing the data"""
    stmt = (
        select(Dataset)
        .where(
            Dataset.id == dataset_id,
            Dataset.deleted_at.is_(None),
        )
    )

    dataset = db.execute(stmt).scalar_one_or_none()

    if dataset is None:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail = "Dataset not found",
        )

    dataset.deleted_at = datetime.now(timezone.utc)
    db.commit()