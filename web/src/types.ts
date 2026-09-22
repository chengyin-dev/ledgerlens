/**
 * Mirrors the JSON returned by the FastAPI backend.
 * schemas.py types cleaning_report and metrics as plain dicts, so these
 * shapes were taken from real responses (sample data and a zero-clean-row
 * upload). If the backend changes those dicts, update this file.
 */

export interface ReportEntry {
  code: string
  label: string
  count: number
}

export interface RejectedRow {
  /** Spreadsheet row number: the header is row 1, so the first data row is 2. */
  row_number: number
  /** Original cell values, keyed by the normalised column name. */
  raw: Record<string, string | null>
}

export interface CleaningReport {
  row_count_raw: number
  row_count_clean: number
  /** row_count_raw - row_count_clean: every excluded row, duplicates included. */
  row_count_rejected: number
  quality_score: number
  dropped_columns: string[]
  corrections: ReportEntry[]
  /** Counts per reason. One row can fail several checks. */
  rejections: ReportEntry[]
  rejected_sample: RejectedRow[]
}

export interface PeriodPoint {
  /** "YYYY-MM" when period_grain is "month", "YYYY-MM-DD" when "day". */
  period: string
  revenue: number
  orders: number
}

export interface ProductPoint {
  product: string
  revenue: number
  units: number
}

export interface CategoryPoint {
  category: string
  revenue: number
  /** Percentage from 0 to 100, e.g. 86.8. */
  share: number
}

export interface Metrics {
  total_revenue: number
  total_orders: number
  total_units: number
  avg_order_value: number
  unique_products: number
  date_range: { start: string | null; end: string | null }
  period_grain: 'day' | 'month'
  revenue_by_period: PeriodPoint[]
  top_products: ProductPoint[]
  revenue_by_category: CategoryPoint[]
}

export interface DatasetSummary {
  id: string
  name: string
  source: 'upload' | 'sample'
  uploaded_at: string
  row_count_raw: number
  row_count_clean: number
  /** Pydantic serialises Decimal as a string, e.g. "88.93". */
  quality_score: string
}

export interface DatasetDetail extends DatasetSummary {
  currency: string
  cleaning_report: CleaningReport
  metrics: Metrics
}