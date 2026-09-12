"""Request and response shapes for the API"""

from __future__ import annotations 

import uuid 
from datetime import datetime 
from decimal import Decimal 

from pydantic import BaseModel, ConfigDict

class DatasetSummary(BaseModel):
    """A dataset as it appears in the history list"""

    model_config = ConfigDict(from_attributes = True)

    id: uuid.UUID 
    name: str 
    source: str 
    uploaded_at: datetime
    row_count_raw: int
    row_count_clean: int
    quality_score: Decimal 



class DatasetDetail(DatasetSummary):
    """A dataset with its full report and metrics"""

    currency: str 
    cleaning_report: dict
    metrics: dict