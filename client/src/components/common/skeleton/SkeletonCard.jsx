import Skeleton from './Skeleton'

/**
 * Reusable SkeletonCard for summary & metric stat cards.
 * Visually mirrors .stat-card / .card dimensions with icon, label, and value.
 */
export function SkeletonCard({ compact = false, height, className = '' }) {
  return (
    <div
      className={`card stat-card ${className}`}
      style={{
        background: '#fff',
        padding: compact ? '12px 16px' : '16px 20px',
        borderRadius: '12px',
        height: height || 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
      aria-busy="true"
    >
      <Skeleton variant="rounded" width={38} height={38} borderRadius={10} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Skeleton variant="text" width="60%" height={14} />
        <Skeleton variant="rounded" width="80%" height={24} borderRadius={4} />
      </div>
    </div>
  )
}

export default SkeletonCard
