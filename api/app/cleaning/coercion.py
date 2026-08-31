"""Helpers for tidying text columns and turning text into numbers"""

from __future__ import annotations

import pandas as pd

# Anything that isnt a digit, decimal point, minus sign, or bracket
CURRENCY_NOISE = r"[^\d.\-()]"

def trim_strings(frame: pd.DataFrame) -> pd.DataFrame:
    """Strip leading and trailing whitespace from every column"""
    frame = frame.copy()
    for column in frame.columns:
        frame[column] = frame[column].str.strip()
    return frame 

def normalise_case(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Title-case the given columns so 'BLUE MUG' and 'blue mug' agree"""
    frame = frame.copy()
    for column in columns:
        if column in frame.columns:
            frame[column] = frame[column].str.title()

    return frame

def parenthesised_to_negative(series: pd.Series) -> pd.Series:
    """Rewrite accounting-style negatives: '(45.00)' -> '-45.00' """
    return series.str.replace(
        r"^\((.+)\)$",
        r"-\1",
        regex = True,
    )

DATE_FORMATS = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%m-%d-%Y",
    "%d %b %Y",
    "%Y/%m/%d",
]

def parse_dates(series: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Parse a text column of dates written in several formats
    
    Returns the parsed dates, plus a True / False column marking values
    could not be interpreted. Blanks are not failures here.
    """

    result = pd.Series(pd.NaT, index = series.index, dtype = "datetime64[ns]")

    for fmt in DATE_FORMATS:
        mask = result.isna()

        if not mask.any():
            break

        parsed = pd.to_datetime(
            series.loc[mask],
            format = fmt,
            errors = "coerce",
        )

        success = parsed.notna()
        result.loc[mask] = parsed.loc[success]

    failed = result.isna() & (series.str.strip() != "")
    return result, failed

def strip_numeric_noise(series: pd.Series) -> pd.Series:
    """Remove currency symbols and separators, and convert bracket negatives."""
    stripped = series.str.replace(CURRENCY_NOISE, "", regex = True)
    return parenthesised_to_negative(stripped)


def to_numeric(series: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Convert a text column to numbers.

    Returns the numbers, plus a True/False column marking values that could
    not be interpreted. Blank cells are not failures here - missing required
    values are a separate concern, handled later.
    """
    stripped = strip_numeric_noise(series)
    numbers = pd.to_numeric(stripped, errors = "coerce")
    failed = numbers.isna() & (series.str.strip() !="")
    return numbers, failed 