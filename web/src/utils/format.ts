/**
 * Every number, money value, score and date in the UI goes through here.
 * None of these functions throw: bad input renders as an em dash or the raw
 * string, never a crashed page.
 */

const FALLBACK_CURRENCY = 'USD'
const EMPTY = '—'

function currencyFormatter(
  currency: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, ...options })
  } catch {
    // Invalid or missing ISO code throws RangeError. Don't take the page down.
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: FALLBACK_CURRENCY,
      ...options,
    })
  }
}

export function formatMoney(value: number, currency: string, decimals = 0): string {
  if (!Number.isFinite(value)) {
    return EMPTY
  }

  // Set both bounds: some engines throw when max < the currency's default min.
  return currencyFormatter(currency, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCompactMoney(value: number, currency: string): string {
  if (!Number.isFinite(value)) {
    return EMPTY
  }

  return currencyFormatter(currency, {
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? new Intl.NumberFormat().format(value) : EMPTY
}

/** quality_score arrives as a string ("88.93"). Returns null if unusable. */
export function parseScore(score: string | number): number | null {
  const value = typeof score === 'number' ? score : parseFloat(score)
  return Number.isFinite(value) ? value : null
}

export function formatScore(score: string | number): string {
  const value = parseScore(score)
  return value === null ? EMPTY : `${value.toFixed(1)}%`
}

/** Parses "YYYY-MM" or "YYYY-MM-DD" as a local date, avoiding UTC day shifts. */
function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(value)

  if (!match) {
    return null
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3] ?? 1))
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null): string {
  if (!value) {
    return EMPTY
  }

  const date = parseCalendarDate(value)
  return date
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
    : value
}

export function formatDateTime(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function formatPeriod(value: string, grain: 'day' | 'month'): string {
  const date = parseCalendarDate(value)

  if (!date) {
    return value
  }

  const options: Intl.DateTimeFormatOptions =
    grain === 'month' ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' }

  return new Intl.DateTimeFormat(undefined, options).format(date)
}

export function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}