import type { DatasetDetail, DatasetSummary } from '../types'

const rawApiUrl = import.meta.env.VITE_API_URL

if (!rawApiUrl) {
  throw new Error('VITE_API_URL is not configured')
}

// A trailing slash in the env var would produce "//api/datasets".
const API_URL = rawApiUrl.replace(/\/+$/, '')

/** status is 0 when the request never got a response. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** True when a GET for one resource can never succeed: missing or malformed id. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 422)
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()

    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail

      if (typeof detail === 'string') {
        return detail
      }

      if (Array.isArray(detail)) {
        return detail
          .map((item: { msg?: string }) => item.msg ?? 'Validation error')
          .join(', ')
      }
    }
  } catch {
    // Not JSON, e.g. an HTML error page from a proxy. Fall through.
  }

  if (response.status >= 500) {
    return `The server hit an error (${response.status}). Try again in a moment.`
  }

  return `Request failed with status ${response.status}.`
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, options)
  } catch {
    throw new ApiError(
      "Couldn't reach the server. Check your connection and try again.",
      0,
    )
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status)
  }

  // DELETE returns 204 No Content, so there is no body to parse.
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function listDatasets(): Promise<DatasetSummary[]> {
  return request<DatasetSummary[]>('/api/datasets')
}

export function getDataset(id: string): Promise<DatasetDetail> {
  return request<DatasetDetail>(`/api/datasets/${encodeURIComponent(id)}`)
}

export function uploadCsv(file: File): Promise<DatasetDetail> {
  const formData = new FormData()
  formData.append('file', file)

  return request<DatasetDetail>('/api/datasets/upload', {
    method: 'POST',
    body: formData,
  })
}

export function loadSample(): Promise<DatasetDetail> {
  return request<DatasetDetail>('/api/datasets/sample', { method: 'POST' })
}

export function deleteDataset(id: string): Promise<void> {
  return request<void>(`/api/datasets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}