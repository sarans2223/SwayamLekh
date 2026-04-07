import React, { useEffect, useMemo, useRef, useState } from 'react'

// Calm, minimal loading screen shown while preloading all question audio
export default function ExamLoadingScreen({
  loadingProgress = 0,
  totalQuestions = 0,
  cacheReady = false,
  onReady,
}) {
  const startRef = useRef(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Track elapsed time to estimate remaining duration
  useEffect(() => {
    if (!startRef.current) {
      startRef.current = performance.now()
    }
    const id = setInterval(() => {
      const now = performance.now()
      setElapsedSec((now - startRef.current) / 1000)
    }, 500)
    return () => clearInterval(id)
  }, [])

  const percent = useMemo(() => {
    if (!totalQuestions) return 0
    return Math.min(100, Math.round((loadingProgress / totalQuestions) * 100))
  }, [loadingProgress, totalQuestions])

  const preparingLabel = useMemo(() => {
    if (!totalQuestions) return 'Preparing your questions...'
    const nextIndex = Math.min(loadingProgress + 1, totalQuestions)
    return `Preparing question ${nextIndex} of ${totalQuestions}...`
  }, [loadingProgress, totalQuestions])

  const estimatedRemaining = useMemo(() => {
    if (!totalQuestions || loadingProgress <= 0) return null
    const avgPerItem = elapsedSec / Math.max(1, loadingProgress)
    const remaining = Math.max(0, Math.round(avgPerItem * (totalQuestions - loadingProgress)))
    return formatTime(remaining)
  }, [elapsedSec, loadingProgress, totalQuestions])

  const primaryMessage = cacheReady ? 'Your exam is ready' : preparingLabel
  const secondaryMessage = cacheReady
    ? 'All question audio is cached for instant playback.'
    : 'Please wait. Preparing your exam for the best experience.'

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>Swayam Lekh</div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${percent}%` }} />
        </div>
        <div style={styles.statusText}>{primaryMessage}</div>
        <div style={styles.subText}>{secondaryMessage}</div>

        {totalQuestions > 0 && !cacheReady && (
          <div style={styles.detail}>{preparingLabel}</div>
        )}

        <div style={styles.percentRow}>
          <div style={styles.percentValue}>{percent}%</div>
          {estimatedRemaining && !cacheReady && (
            <div style={styles.eta}>Estimated time remaining: {estimatedRemaining}</div>
          )}
        </div>

        {!cacheReady && (
          <div style={styles.tip}>
            This will take a short moment. Your exam will begin automatically once ready.
          </div>
        )}

        {cacheReady && (
          <button style={styles.button} onClick={onReady}>
            Begin Exam
          </button>
        )}
      </div>
    </div>
  )
}

function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${r}s`
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: 'var(--space-8)',
  },
  card: {
    width: 'min(520px, 92vw)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    padding: 'var(--space-8)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
    textAlign: 'center',
  },
  header: {
    fontFamily: 'var(--font-serif)',
    fontSize: 'var(--text-2xl)',
    color: 'var(--ink)',
    marginBottom: 'var(--space-2)',
    letterSpacing: '0.02em',
  },
  progressBar: {
    width: '100%',
    height: '12px',
    background: 'var(--surface2)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-hover) 100%)',
    transition: 'width var(--transition-base)',
  },
  statusText: {
    fontSize: 'var(--text-xl)',
    color: 'var(--ink)',
    fontWeight: 700,
  },
  subText: {
    fontSize: 'var(--text-sm)',
    color: 'var(--ink2)',
  },
  detail: {
    fontSize: 'var(--text-sm)',
    color: 'var(--ink2)',
  },
  percentRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2)',
    marginTop: 'var(--space-2)',
  },
  percentValue: {
    fontSize: 'var(--text-3xl)',
    fontWeight: 700,
    color: 'var(--ink)',
    letterSpacing: '-0.02em',
  },
  eta: {
    fontSize: 'var(--text-sm)',
    color: 'var(--ink2)',
  },
  tip: {
    fontSize: 'var(--text-sm)',
    color: 'var(--ink2)',
    lineHeight: 1.6,
  },
  button: {
    marginTop: 'var(--space-2)',
    padding: '12px 18px',
    background: 'var(--accent)',
    color: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-base)',
    fontWeight: 700,
    transition: 'background var(--transition-fast)',
  },
}
