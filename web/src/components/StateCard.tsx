import type { ReactNode } from 'react'

/** Full-width message for error, not-found and empty states. */
function StateCard({
  title,
  message,
  tone = 'neutral',
  action,
}: {
  title: string
  message: string
  tone?: 'neutral' | 'error'
  action?: ReactNode
}) {
  return (
    <section className="state-card" role={tone === 'error' ? 'alert' : undefined}>
      {tone === 'error' && (
        <div className="state-icon state-icon-error" aria-hidden="true">
          !
        </div>
      )}
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </section>
  )
}

export default StateCard