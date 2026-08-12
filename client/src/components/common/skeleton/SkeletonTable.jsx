import Skeleton from './Skeleton'

/**
 * Reusable SkeletonTable for data tables across portal pages.
 * Supports configurable rows, columns, header, and compact mode.
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  compact = false,
  className = '',
}) {
  const rowList = Array.from({ length: rows })
  const colList = Array.from({ length: columns })

  return (
    <div className={`table-responsive ${className}`} style={{ width: '100%', overflowX: 'auto' }} aria-busy="true">
      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        {showHeader && (
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              {colList.map((_, cIdx) => (
                <th key={cIdx} style={{ padding: compact ? '8px 10px' : '12px' }}>
                  <Skeleton variant="text" width={cIdx === 0 ? '70%' : '50%'} height={14} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rowList.map((_, rIdx) => (
            <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
              {colList.map((_, cIdx) => (
                <td key={cIdx} style={{ padding: compact ? '8px 10px' : '12px' }}>
                  <Skeleton
                    variant="rounded"
                    width={cIdx === 0 ? '80%' : cIdx === columns - 1 ? '40%' : '60%'}
                    height={16}
                    borderRadius={3}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SkeletonTable
