import { formatScore, parseScore } from '../utils/format'

type Tone = 'good' | 'warning' | 'poor'

const TONES: Record<Tone, { label: string; icon: string }> = {
  good: { label: 'Good quality', icon: '✓' },
  warning: { label: 'Some issues', icon: '!' },
  poor: { label: 'Poor quality', icon: '×' },
}

function toneFor(score: number | null): Tone {
  if (score === null || score < 70) return 'poor'
  if (score < 90) return 'warning'
  return 'good'
}

/** Colour is never the only signal: every badge carries a word and an icon. */
function QualityBadge({ score, size = 'md' }: { score: string; size?: 'sm' | 'md' }) {
  const tone = toneFor(parseScore(score))
  const { label, icon } = TONES[tone]

  return (
    <span className={`quality-badge quality-${tone} quality-badge-${size}`}>
      <span className="quality-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="num">
        {label} · {formatScore(score)}
      </span>
    </span>
  )
}

export default QualityBadge