import Skeleton from './Skeleton'

/**
 * Reusable SkeletonChart for Line, Bar, and Pie chart placeholders.
 * Reserves exact chart card space (~280-320px) preventing layout jumps.
 */
export function SkeletonChart({ title, subtitle, height = 280, className = '' }) {
  return (
    <div
      className={`card chart-card ${className}`}
      style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}
      aria-busy="true"
    >
      <div className="card-header chart-card-header" style={{ marginBottom: '16px' }}>
        <div className="chart-card-heading" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {title ? (
            <h3 className="card-title chart-card-title">{title}</h3>
          ) : (
            <Skeleton variant="rounded" width={160} height={18} />
          )}
          {subtitle ? (
            <p className="chart-card-subtitle">{subtitle}</p>
          ) : (
            <Skeleton variant="text" width={220} height={12} />
          )}
        </div>
      </div>

      <div style={{ position: 'relative', height: `${height}px`, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '12px', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', height: '80%' }}>
          <Skeleton variant="rounded" width="18%" height="60%" borderRadius={4} />
          <Skeleton variant="rounded" width="18%" height="85%" borderRadius={4} />
          <Skeleton variant="rounded" width="18%" height="45%" borderRadius={4} />
          <Skeleton variant="rounded" width="18%" height="95%" borderRadius={4} />
          <Skeleton variant="rounded" width="18%" height="70%" borderRadius={4} />
        </div>
        <Skeleton variant="text" width="100%" height={14} />
      </div>
    </div>
  )
}

export default SkeletonChart
