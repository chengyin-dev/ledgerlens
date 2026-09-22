import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteDataset, errorMessage, listDatasets } from '../api/client'
import QualityBadge from '../components/QualityBadge'
import StateCard from '../components/StateCard'
import type { DatasetSummary } from '../types'
import { formatDateTime, formatNumber } from '../utils/format'

type LoadResult =
  | { attempt: number; ok: true; datasets: DatasetSummary[] }
  | { attempt: number; ok: false; error: unknown }

function HistorySkeleton() {
  return (
    <div className="card table-card" aria-busy="true" aria-label="Loading datasets">
      <div className="skeleton-table">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="skeleton skeleton-row" key={index} />
        ))}
      </div>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function HistoryPage() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [target, setTarget] = useState<DatasetSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    listDatasets().then(
      (datasets) => {
        if (!ignore) setResult({ attempt, ok: true, datasets })
      },
      (error: unknown) => {
        if (!ignore) setResult({ attempt, ok: false, error })
      },
    )

    return () => {
      ignore = true
    }
  }, [attempt])

  function askToDelete(dataset: DatasetSummary) {
    setTarget(dataset)
    setDeleteError(null)
    dialogRef.current?.showModal()
  }

  function closeDialog() {
    if (!isDeleting) dialogRef.current?.close()
  }

  async function confirmDelete() {
    if (!target) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteDataset(target.id)
      setResult((current) =>
        current?.ok
          ? { ...current, datasets: current.datasets.filter((item) => item.id !== target.id) }
          : current,
      )
      setIsDeleting(false)
      dialogRef.current?.close()
    } catch (err) {
      setDeleteError(errorMessage(err, "Couldn't delete this dataset. Try again."))
      setIsDeleting(false)
    }
  }

  let content

  if (result === null || result.attempt !== attempt) {
    content = <HistorySkeleton />
  } else if (!result.ok) {
    content = (
      <StateCard
        tone="error"
        title="Couldn't load your datasets"
        message={errorMessage(result.error, 'Something went wrong loading your history.')}
        action={
          <button type="button" className="button button-primary" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        }
      />
    )
  } else if (result.datasets.length === 0) {
    content = (
      <StateCard
        title="No datasets yet"
        message="Upload a CSV to see what gets cleaned and what your sales look like."
        action={
          <Link to="/" className="button button-primary">
            Upload your first CSV
          </Link>
        }
      />
    )
  } else {
    content = (
      <div className="card table-card">
        <div className="table-scroll" tabIndex={0} aria-label="Datasets, scrollable">
          <table className="data-table history-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Source</th>
                <th scope="col">Uploaded</th>
                <th scope="col" className="align-right">Rows kept</th>
                <th scope="col">Quality</th>
                <th scope="col" className="align-right">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.datasets.map((dataset) => (
                <tr key={dataset.id}>
                  <td>
                    <Link to={`/datasets/${dataset.id}`} className="table-link">
                      {dataset.name}
                    </Link>
                  </td>
                  <td>
                    <span className={`pill pill-${dataset.source}`}>
                      {dataset.source === 'sample' ? 'Sample' : 'Upload'}
                    </span>
                  </td>
                  <td className="nowrap">{formatDateTime(dataset.uploaded_at)}</td>
                  <td className="align-right nowrap num">
                    {formatNumber(dataset.row_count_clean)} of {formatNumber(dataset.row_count_raw)}
                  </td>
                  <td>
                    <QualityBadge score={dataset.quality_score} size="sm" />
                  </td>
                  <td className="align-right">
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      aria-label={`Delete ${dataset.name}`}
                      onClick={() => askToDelete(dataset)}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>History</h1>
        <p>Every dataset you've uploaded, newest first.</p>
      </header>

      {content}

      {/* Native dialog: focus trap, Escape to close and focus return come built in. */}
      <dialog
        ref={dialogRef}
        className="dialog"
        aria-labelledby="delete-title"
        onClose={() => setTarget(null)}
        onCancel={(event) => {
          if (isDeleting) event.preventDefault()
        }}
      >
        <h2 id="delete-title">Delete this dataset?</h2>
        <p>
          {target ? <strong>{target.name}</strong> : 'This dataset'} will be removed and its report
          will no longer be available. This can't be undone.
        </p>

        {deleteError && (
          <div className="error-box" role="alert">
            {deleteError}
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={closeDialog} disabled={isDeleting}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => void confirmDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </dialog>
    </main>
  )
}

export default HistoryPage