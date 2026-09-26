import type { RejectedRow } from '../../types'
import { formatNumber } from '../../utils/format'

const COLUMN_LABELS: Record<string, string> = {
  order_id: 'Order ID',
  order_date: 'Date',
  product: 'Product',
  category: 'Category',
  customer_name: 'Customer',
  quantity: 'Qty',
  unit_price: 'Price',
  line_total: 'Total',
}

// Known columns first, in a sensible reading order; anything else follows.
const PREFERRED_ORDER = Object.keys(COLUMN_LABELS)

function labelFor(key: string): string {
  if (COLUMN_LABELS[key]) {
    return COLUMN_LABELS[key]
  }

  const words = key.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Column set is built from the data, so extra or missing columns still render. */
function columnsFor(rows: RejectedRow[]): string[] {
  const keys = new Set<string>()
  rows.forEach((row) => Object.keys(row.raw).forEach((key) => keys.add(key)))

  const known = PREFERRED_ORDER.filter((key) => keys.has(key))
  const extra = [...keys].filter((key) => !PREFERRED_ORDER.includes(key)).sort()
  return [...known, ...extra]
}

function RawCell({ value }: { value: string | null | undefined }) {
  if (value === null || value === undefined || value.trim() === '') {
    return <span className="raw-empty">empty</span>
  }

  // white-space: pre in CSS keeps leading and trailing spaces visible.
  return <span className="raw-value">{value}</span>
}

function RejectedRowsTable({ rows, totalExcluded }: { rows: RejectedRow[]; totalExcluded: number }) {
  const columns = columnsFor(rows)

  return (
    <section className="report-section" aria-labelledby="rejected-heading">
      <div className="section-heading">
        <h2 id="rejected-heading">Rows we couldn't use</h2>
        {rows.length > 0 ? (
          <p>
            Showing <span className="num">{formatNumber(rows.length)}</span>{' '}
            {rows.length === 1
              ? 'example row exactly as it appears'
              : 'example rows exactly as they appear'} in your file. Row
            numbers match your spreadsheet.
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="card table-empty">
          <p>
            {totalExcluded > 0
              ? 'No example rows were recorded for this dataset.'
              : 'Every row in your file was usable.'}
          </p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-scroll" tabIndex={0} aria-label="Rejected rows, scrollable">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" className="col-row">
                    Row
                  </th>
                  {columns.map((column) => (
                    <th scope="col" key={column}>
                      {labelFor(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.row_number}>
                    <td className="col-row num">{formatNumber(row.row_number)}</td>
                    {columns.map((column) => (
                      <td key={column}>
                        <RawCell value={row.raw[column]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export default RejectedRowsTable