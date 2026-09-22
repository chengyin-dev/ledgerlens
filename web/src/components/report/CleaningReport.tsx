import type { CleaningReport as CleaningReportData, ReportEntry } from '../../types'
import { formatNumber } from '../../utils/format'

function IssueList({
  entries,
  tone,
  emptyMessage,
}: {
  entries: ReportEntry[]
  tone: 'corrected' | 'rejected'
  emptyMessage: string
}) {
  const visible = entries.filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count)

  if (visible.length === 0) {
    return <p className="issue-empty">{emptyMessage}</p>
  }

  return (
    <ul className="issue-list">
      {visible.map((entry) => (
        <li className="issue-row" key={entry.code}>
          <span className={`issue-dot issue-dot-${tone}`} aria-hidden="true" />
          <span className="issue-label">{entry.label}</span>
          <span className="issue-count num">{formatNumber(entry.count)}</span>
        </li>
      ))}
    </ul>
  )
}

function CleaningReport({ report }: { report: CleaningReportData }) {
  return (
    <section className="report-section" aria-labelledby="cleaning-heading">
      <div className="section-heading">
        <h2 id="cleaning-heading">What happened to your data</h2>
        <p>
          <span className="num">{formatNumber(report.row_count_raw)}</span> rows read,{' '}
          <span className="num">{formatNumber(report.row_count_clean)}</span> kept,{' '}
          <span className="num">{formatNumber(report.row_count_rejected)}</span> left out of
          the figures.
        </p>
      </div>

      <div className="cleaning-grid">
        <article className="card issue-panel issue-panel-corrected">
          <h3>What we corrected</h3>
          <p className="issue-explainer">Changes applied automatically</p>
          <IssueList
            entries={report.corrections}
            tone="corrected"
            emptyMessage="Nothing needed correcting."
          />
        </article>

        <article className="card issue-panel issue-panel-rejected">
          <h3>What we couldn't use</h3>
          <p className="issue-explainer">
            Rows left out of the figures above. A row can fail more than one check.
          </p>
          <IssueList
            entries={report.rejections}
            tone="rejected"
            emptyMessage="Every row passed validation."
          />
        </article>
      </div>

      {report.dropped_columns.length > 0 && (
        <p className="dropped-columns">
          Columns ignored because they aren't used in the report:{' '}
          {report.dropped_columns.join(', ')}
        </p>
      )}
    </section>
  )
}

export default CleaningReport