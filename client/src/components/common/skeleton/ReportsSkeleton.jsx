import Skeleton from './Skeleton'
import SkeletonCard from './SkeletonCard'
import SkeletonChart from './SkeletonChart'
import SkeletonTable from './SkeletonTable'

/**
 * Composite ReportsSkeleton layout mirroring ReportsPage structure.
 */
export function ReportsSkeleton() {
  return (
    <div className="portal-page" aria-busy="true" aria-live="polite">
      {/* Header Skeleton */}
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <Skeleton variant="rounded" width={280} height={28} style={{ marginBottom: '8px' }} />
          <Skeleton variant="text" width={400} height={16} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton variant="rounded" width={140} height={36} borderRadius={6} />
          <Skeleton variant="rounded" width={90} height={36} borderRadius={6} />
        </div>
      </div>

      {/* Report Tabs Skeleton */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <Skeleton variant="rounded" width={220} height={36} borderRadius={6} />
        <Skeleton variant="rounded" width={220} height={36} borderRadius={6} />
        <Skeleton variant="rounded" width={220} height={36} borderRadius={6} />
      </div>

      {/* Summary Stat Cards Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Charts Grid Skeleton */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <SkeletonChart height={280} />
        <SkeletonChart height={280} />
      </div>

      {/* Data Table Skeleton Card */}
      <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
        <Skeleton variant="text" width={200} height={18} style={{ marginBottom: '16px' }} />
        <SkeletonTable rows={6} columns={6} />
      </div>
    </div>
  )
}

export default ReportsSkeleton
