import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage, loadSample, uploadCsv } from '../api/client'
import { MAX_UPLOAD_BYTES } from '../../theme'
import type { DatasetDetail } from '../types'

type UploadAction = 'upload' | 'sample' | null

function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}

function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [action, setAction] = useState<UploadAction>(null)

  const isProcessing = action !== null

  /** Shared by upload and sample: both return a dataset to open. */
  async function run(kind: 'upload' | 'sample', task: () => Promise<DatasetDetail>) {
    setError(null)
    setAction(kind)

    try {
      const dataset = await task()
      navigate(`/datasets/${dataset.id}`)
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Try again.'))
      setAction(null)
    }
  }

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only .csv files are accepted. Export your spreadsheet as CSV and try again.')
      return
    }

    // Checked here so the user isn't left waiting for the server to say 413.
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`This file is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB. Split it into smaller files and try again.`)
      return
    }

    void run('upload', () => uploadCsv(file))
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) processFile(file)
    // Reset so choosing the same file again still fires onChange.
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (isProcessing) return

    const file = event.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!isProcessing) setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    // dragleave also fires when moving onto a child such as the button; ignore that.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setIsDragging(false)
  }

  return (
    <main className="page page-upload">
      <div className="upload-container">
        <header className="upload-intro">
          <h1>Turn a messy sales spreadsheet into a clean report</h1>
          <p>
            Upload a CSV and see exactly what was corrected, what was rejected, and what your
            numbers actually say.
          </p>
        </header>

        <div
          className={`dropzone${isDragging ? ' is-dragging' : ''}${isProcessing ? ' is-processing' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className="dropzone-prompt">Drag a CSV here, or</p>

          <button
            type="button"
            className="button button-primary"
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
          >
            {action === 'upload' ? (
              <>
                <Spinner />
                Processing…
              </>
            ) : (
              'Choose file'
            )}
          </button>

          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileInput}
            disabled={isProcessing}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}

        <div className="sample-action">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void run('sample', loadSample)}
            disabled={isProcessing}
          >
            {action === 'sample' ? (
              <>
                <Spinner />
                Processing…
              </>
            ) : (
              'Load sample data'
            )}
          </button>
        </div>

        <p className="expected-columns">
          Expected columns: order ID, date, product, quantity, unit price. Category, customer,
          and total are optional. Common alternative names are matched automatically.
        </p>

        {isProcessing && (
          <p className="visually-hidden" role="status">
            Processing your data. This can take a few seconds.
          </p>
        )}
      </div>
    </main>
  )
}

export default UploadPage