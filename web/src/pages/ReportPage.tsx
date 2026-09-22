import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { errorMessage, getDataset, isNotFound } from '../api/client'
import QualityBadge from '../components/QualityBadge'
import StateCard from '../components/StateCard'
import CleaningReport from '../components/report/CleaningReport'
import RejectedRowsTable from '../components/report/RejectedRowsTable'
import { CategoryChart, RevenueChart, TopProductsChart } from '../components/report/ReportCharts'
import type { DatasetDetail } from '../types'
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../utils/format'

type LoadResult =
  | { key: string; ok: true; dataset: DatasetDetail }
  | { key: string; ok: false; error: unknown }

function ReportSkeleton() {
  return (
    <div className="report-layout" aria-busy="true" aria-label="Loading report">
      <div className="report-header">
        <div className="report-title-block">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-meta" />
        </div>
        <div className="skeleton skeleton-badge" />
      </div>

      <div className="kpi-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="card kpi-card" key={index}>
            <div className="skeleton skeleton-kpi-label" />
            <div className="skeleton skeleton-kpi-value" />
          </div>
        ))}
      </div>

      <div className="cleaning-grid">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="card issue-panel" key={index}>
            <div className="skeleton skeleton-heading" />
            {Array.from({ length: 4 }, (_, row) => (
              <div className="skeleton skeleton-row" key={row} />
            ))}
          </div>
        ))}
      </div>

      <div className="card chart-card">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton chart-box chart-box-revenue" />
      </div>
    </div>
  )
}

function ReportPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)

  // Loading is derived, not stored: any result that doesn't match the current
  // id and attempt is stale, so "No data" can never show mid-request.
  const requestKey = `${id}:${attempt}`

  useEffect(() => {
    let ignore = false

    getDataset(id).then(
      (dataset) => {
        if (!ignore) setResult({ key: requestKey, ok: true, dataset })
      },
      (error: unknown) => {
        if (!ignore) setResult({ key: requestKey, ok: false, error })
      },
    )

    // A newer id or retry makes this response irrelevant.
    return () => {
      ignore = true
    }
  }, [id, requestKey])

  let content

  if (result === null || result.key !== requestKey) {
    content = <ReportSkeleton />
  } else if (!result.ok) {
    content = isNotFound(result.error) ? (
      <StateCard
        title="Report not found"
        message="This dataset doesn't exist or has been deleted."
        action={
          <Link to="/datasets" className="button button-primary">
            Go to history
          </Link>
        }
      />
    ) : (
      <StateCard
        tone="error"
        title="Couldn't load this report"
        message={errorMessage(result.error, 'Something went wrong loading the report.')}
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry
          </button>
        }
      />
    )
  } else {
    content = <Report dataset={result.dataset} />
  }

  return <main className="page">{content}</main>
}

function Report({ dataset }: { dataset: DatasetDetail }) {
  const { metrics, currency, cleaning_report: report } = dataset
  const hasCleanRows = dataset.row_count_clean > 0
  const { start, end } = metrics.date_range

  return (
    <div className="report-layout">
      <header className="report-header">
        <div className="report-title-block">
          <h1>{dataset.name}</h1>
          <p className="report-meta">
            Uploaded {formatDateTime(dataset.uploaded_at)}
            {start && end && (
              <>
                <br />
                Sales from {formatDate(start)} to {formatDate(end)}
              </>
            )}
          </p>
        </div>
        <QualityBadge score={dataset.quality_score} />
      </header>

      {!hasCleanRows && (
        <div className="notice" role="status">
          None of the {formatNumber(dataset.row_count_raw)}{' '}
          {dataset.row_count_raw === 1 ? 'row' : 'rows'} in this file could be used, so there
          are no sales figures. The sections below show what went wrong.
        </div>
      )}

      <section className="kpi-grid" aria-label="Key figures">
        <KpiCard label="Total revenue" value={formatMoney(metrics.total_revenue, currency)} />
        <KpiCard label="Orders" value={formatNumber(metrics.total_orders)} />
        <KpiCard
          label="Average order value"
          value={hasCleanRows ? formatMoney(metrics.avg_order_value, currency, 2) : '—'}
        />
        <KpiCard label="Units sold" value={formatNumber(metrics.total_units)} />
      </section>

      <CleaningReport report={report} />

      <section className="report-section" aria-labelledby="charts-heading">
        <div className="section-heading">
          <h2 id="charts-heading">Sales</h2>
          <p>Built only from the rows that passed cleaning.</p>
        </div>

        <div className="chart-stack">
          <RevenueChart
            data={metrics.revenue_by_period}
            currency={currency}
            grain={metrics.period_grain}
          />
          <div className="chart-pair">
            <TopProductsChart data={metrics.top_products} currency={currency} />
            <CategoryChart data={metrics.revenue_by_category} currency={currency} />
          </div>
        </div>
      </section>

      <RejectedRowsTable rows={report.rejected_sample} totalExcluded={report.row_count_rejected} />
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="card kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value num">{value}</div>
    </article>
  )
}

export default ReportPage