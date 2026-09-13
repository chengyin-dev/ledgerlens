export interface ReportEntry {
  code: string;
  label: string;
  count: number;
}

export interface RejectedRow {
  row_number: number;
  raw: Record<string, string>;
}

export interface CleaningReport {
  row_count_raw: number;
  row_count_clean: number;
  row_count_rejected: number;
  quality_score: number;
  dropped_columns: string[];
  corrections: ReportEntry[];
  rejections: ReportEntry[];
  rejected_sample: RejectedRow[];
}

export interface PeriodPoint {
  period: string;
  revenue: number;
  orders: number;
}

export interface ProductPoint {
  product: string;
  revenue: number;
  units: number;
}

export interface CategoryPoint {
  category: string;
  revenue: number;
  share: number;
}

export interface Metrics {
  total_revenue: number;
  total_orders: number;
  total_units: number;
  avg_order_value: number;
  unique_products: number;
  date_range: { start: string | null; end: string | null };
  period_grain: "day" | "month";
  revenue_by_period: PeriodPoint[];
  top_products: ProductPoint[];
  revenue_by_category: CategoryPoint[];
}

export interface DatasetSummary {
  id: string;
  name: string;
  source: "upload" | "sample";
  uploaded_at: string;
  row_count_raw: number;
  row_count_clean: number;
  quality_score: string;
}

export interface DatasetDetail extends DatasetSummary {
  currency: string;
  cleaning_report: CleaningReport;
  metrics: Metrics;
}