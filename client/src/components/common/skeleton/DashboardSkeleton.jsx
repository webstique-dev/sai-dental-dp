import Skeleton from './Skeleton'
import SkeletonCard from './SkeletonCard'
import SkeletonChart from './SkeletonChart'
import SkeletonList from './SkeletonList'

/**
 * Composite DashboardSkeleton layout mirroring DashboardPage structure.
 */
export function DashboardSkeleton() {
  return (
    <div className="portal-page" aria-busy="true" aria-live="polite">
      {/* Header Skeleton */}
      <div className="portal-heading" style={{ marginBottom: '24px' }}>
        <Skeleton variant="rounded" width={260} height={28} style={{ marginBottom: '8px' }} />
        <Skeleton variant="text" width={420} height={16} />
      </div>

      {/* Quick Action Shortcuts Skeleton */}
      <div className="card mb-6" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
        <Skeleton variant="text" width={180} height={18} style={{ marginBottom: '16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <Skeleton variant="rounded" height={44} borderRadius={6} />
          <Skeleton variant="rounded" height={44} borderRadius={6} />
          <Skeleton variant="rounded" height={44} borderRadius={6} />
          <Skeleton variant="rounded" height={44} borderRadius={6} />
        </div>
      </div>

      {/* Daily Overview Stat Cards Skeleton */}
      <div className="stat-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Analytics Control Bar Skeleton */}
      <div className="card mb-6" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <Skeleton variant="rounded" width={140} height={20} style={{ marginBottom: '4px' }} />
            <Skeleton variant="text" width={280} height={14} />
          </div>
          <Skeleton variant="rounded" width={220} height={36} borderRadius={6} />
        </div>
      </div>

      {/* Summary Cards Grid (8 cards) */}
      <div className="stat-grid" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 8 }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>

      {/* Line Charts Grid Skeleton */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <SkeletonChart title="Sales Trend" height={280} />
        <SkeletonChart title="Profit Trend" height={280} />
      </div>

      {/* Bar & Pie Charts Grid Skeleton */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <SkeletonChart title="Sales vs Purchases" height={280} />
        <SkeletonChart title="Inventory by Category" height={280} />
      </div>

      {/* Recent Activity Skeleton */}
      <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
        <Skeleton variant="text" width={180} height={18} style={{ marginBottom: '16px' }} />
        <SkeletonList items={5} />
      </div>
    </div>
  )
}

export default DashboardSkeleton
