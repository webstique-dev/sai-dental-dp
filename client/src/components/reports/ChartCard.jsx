import Skeleton from '../common/skeleton/Skeleton'

/**
 * ChartCard — wraps every dashboard/report chart in the standard
 * .card + .card-header design language with loading / empty / error states.
 */
export default function ChartCard({
  title,
  subtitle,
  actions,
  loading = false,
  error = '',
  empty = false,
  emptyText = 'No data for the selected period.',
  onRetry,
  className = '',
  children,
}) {
  if (loading) {
    return (
      <div className={`card chart-card ${className}`} style={{ background: '#fff', padding: '20px', borderRadius: '12px' }} aria-busy="true">
        <div className="card-header chart-card-header" style={{ marginBottom: '16px' }}>
          <div className="chart-card-heading" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {title ? <h3 className="card-title chart-card-title">{title}</h3> : <Skeleton variant="rounded" width={160} height={18} />}
            {subtitle ? <p className="chart-card-subtitle">{subtitle}</p> : <Skeleton variant="text" width={220} height={12} />}
          </div>
          {actions && <div className="chart-card-actions">{actions}</div>}
        </div>
        <div style={{ position: 'relative', height: '280px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '12px', paddingBottom: '16px' }}>
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

  return (
    <div className={`card chart-card ${className}`}>
      {(title || actions) && (
        <div className="card-header chart-card-header">
          <div className="chart-card-heading">
            {title && <h3 className="card-title chart-card-title">{title}</h3>}
            {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="chart-card-actions">{actions}</div>}
        </div>
      )}

      {error && (
        <div className="chart-state" role="alert">
          <p className="chart-state-label chart-state-error">{error}</p>
          {onRetry && (
            <button type="button" className="btn btn-sm btn-outline" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}

      {!error && empty && (
        <div className="chart-state">
          <p className="chart-state-label">{emptyText}</p>
        </div>
      )}

      {!error && !empty && <div className="chart-body">{children}</div>}
    </div>
  )
}
