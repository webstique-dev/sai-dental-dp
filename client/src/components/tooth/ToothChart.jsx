import { useState } from 'react'
import { TOOTH_ROWS, PRIMARY_TOOTH_ROWS, TOOTH_CONDITION_BY_VALUE } from '../../constants/options'

function Tooth({ number, status, isMissing, onSelect, selected, disabled }) {
  const condition = TOOTH_CONDITION_BY_VALUE[status] || TOOTH_CONDITION_BY_VALUE.healthy
  const code = condition.code
  const label = condition.label
  const cls = [
    'tooth',
    `tooth-${status}`,
    selected ? 'is-selected' : '',
    isMissing ? 'is-missing' : '',
    disabled ? 'is-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (disabled) {
    return (
      <div className={cls} role="img" aria-label={`Tooth ${number}: ${label}`}>
        <span className="tooth-number">{number}</span>
        {code && <span className="tooth-code">{code}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={cls}
      aria-pressed={selected}
      aria-label={`Tooth ${number}: ${label}`}
      title={`Tooth ${number} — ${label}`}
      onClick={() => onSelect(number)}
    >
      <span className="tooth-number">{number}</span>
      {code && <span className="tooth-code">{code}</span>}
    </button>
  )
}

function Quadrant({ teeth, statusMap, onSelect, selected, disabled }) {
  return (
    <div className="tooth-quadrant">
      {teeth.map((number) => (
        <Tooth
          key={number}
          number={number}
          status={statusMap[number] || 'healthy'}
          isMissing={statusMap[number] === 'missing'}
          selected={selected === number}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export default function ToothChart({
  teeth = [],
  selected,
  onSelect,
  disabled = false,
  showLegend = true,
}) {
  const [dentition, setDentition] = useState('permanent') // 'permanent' | 'primary'

  const map = {}
  for (const t of teeth) {
    map[t.toothNumber] = t.currentStatus || 'healthy'
  }
  const rows = dentition === 'primary' ? PRIMARY_TOOTH_ROWS : TOOTH_ROWS
  const [upperRight, upperLeft] = rows.upper
  const [lowerRight, lowerLeft] = rows.lower

  return (
    <div className="tooth-chart">
      {/* Dentition Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          className={`btn btn-sm ${dentition === 'permanent' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setDentition('permanent')}
          style={{ fontSize: '12px', padding: '4px 10px' }}
        >
          Permanent Dentition (FDI 11–48)
        </button>
        <button
          type="button"
          className={`btn btn-sm ${dentition === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setDentition('primary')}
          style={{ fontSize: '12px', padding: '4px 10px' }}
        >
          Primary / Deciduous (FDI 51–85)
        </button>
      </div>

      <div className="tooth-chart-scroll">
        <div className="tooth-chart-caption">Upper ({dentition === 'primary' ? 'Primary' : 'Permanent'})</div>
        <div className="tooth-chart-row">
          <Quadrant teeth={upperRight} statusMap={map} disabled={disabled} onSelect={onSelect} selected={selected} />
          <Quadrant teeth={upperLeft} statusMap={map} disabled={disabled} onSelect={onSelect} selected={selected} />
        </div>

        <div className="tooth-chart-row">
          <Quadrant teeth={lowerRight} statusMap={map} disabled={disabled} onSelect={onSelect} selected={selected} />
          <Quadrant teeth={lowerLeft} statusMap={map} disabled={disabled} onSelect={onSelect} selected={selected} />
        </div>
        <div className="tooth-chart-title">Lower ({dentition === 'primary' ? 'Primary' : 'Permanent'})</div>
      </div>

      {showLegend && (
        <div className="tooth-legend" aria-label="Tooth status legend">
          {Object.values(TOOTH_CONDITION_BY_VALUE).map((c) => (
            <span key={c.value} className="tooth-legend-item">
              <span className={`legend-dot dot-${c.value}`} aria-hidden="true" />
              {c.label}
              {c.code ? ` (${c.code})` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}