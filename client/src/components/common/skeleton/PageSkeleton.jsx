import Skeleton from './Skeleton'
import SkeletonTable from './SkeletonTable'
import SkeletonCard from './SkeletonCard'

/**
 * Generic PageSkeleton for portal data pages (Patients, Appointments, Inventory, Billing, Users, Settings).
 * Supports layout types: 'table' | 'grid' | 'details'
 */
export function PageSkeleton({ layout = 'table', cards = 3, rows = 6, columns = 5 }) {
  return (
    <div className="portal-page" aria-busy="true" aria-live="polite">
      {/* Header Skeleton */}
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <Skeleton variant="rounded" width={240} height={28} style={{ marginBottom: '8px' }} />
          <Skeleton variant="text" width={380} height={16} />
        </div>
        <Skeleton variant="rounded" width={160} height={36} borderRadius={6} />
      </div>

      {/* Optional Top Cards Grid */}
      {cards > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: '16px', marginBottom: '20px' }}>
          {Array.from({ length: cards }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      )}

      {/* Filter Bar Skeleton */}
      <div className="card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" height={36} style={{ flex: 1, minWidth: '200px' }} borderRadius={6} />
          <Skeleton variant="rounded" width={160} height={36} borderRadius={6} />
        </div>
      </div>

      {/* Main Content Area */}
      {layout === 'table' ? (
        <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <SkeletonTable rows={rows} columns={columns} />
        </div>
      ) : layout === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Skeleton variant="rounded" width="70%" height={20} />
              <Skeleton variant="text" width="90%" height={14} />
              <Skeleton variant="text" width="50%" height={14} />
              <Skeleton variant="rounded" width="100%" height={32} borderRadius={6} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Skeleton variant="rounded" width="50%" height={24} />
          <Skeleton variant="text" width="100%" height={16} />
          <Skeleton variant="text" width="95%" height={16} />
          <Skeleton variant="text" width="80%" height={16} />
          <Skeleton variant="rounded" width="100%" height={200} borderRadius={8} />
        </div>
      )}
    </div>
  )
}

export default PageSkeleton
