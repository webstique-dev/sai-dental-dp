import Skeleton from './Skeleton'

/**
 * Reusable SkeletonList for activity streams, notifications, and list items.
 */
export function SkeletonList({
  items = 4,
  hasAvatar = true,
  hasTrailing = true,
  className = '',
}) {
  const itemList = Array.from({ length: items })

  return (
    <div className={`skeleton-list ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} aria-busy="true">
      {itemList.map((_, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            background: 'var(--color-paper)',
            borderRadius: '8px',
          }}
        >
          {hasAvatar && (
            <Skeleton variant="rounded" width={30} height={30} borderRadius={8} style={{ flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Skeleton variant="text" width="45%" height={14} />
            <Skeleton variant="text" width="70%" height={12} />
          </div>
          {hasTrailing && (
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
              <Skeleton variant="text" width={50} height={14} />
              <Skeleton variant="text" width={35} height={10} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default SkeletonList
