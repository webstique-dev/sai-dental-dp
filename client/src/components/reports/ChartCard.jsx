import { JSX } from 'react'

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

      {loading && (
        <div className="chart-state" role="status">
          <div className="skeleton skeleton-chart" />
          <span className="chart-state-label">Loading…</span>
        </div>
      )}

      {!loading && error && (
        <div className="chart-state" role="alert">
          <p className="chart-state-label chart-state-error">{error}</p>
          {onRetry && (
            <button type="button" className="btn btn-sm btn-outline" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}

      {!loading && !error && empty && (
        <div className="chart-state">
          <p className="chart-state-label">{emptyText}</p>
        </div>
      )}

      {!loading && !error && !empty && <div className="chart-body">{children}</div>}
    </div>
  )
}
