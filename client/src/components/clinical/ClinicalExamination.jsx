import { useState } from 'react'
import { Stethoscope, Check, AlertCircle, Clock, Sparkles } from 'lucide-react'

// Treatment / Condition Options from Reference Image
export const TOOTH_CONDITIONS = [
  { code: 'D', label: 'Caries — D', value: 'caries', color: '#e11d48', bg: '#ffe4e6' },
  { code: 'M', label: 'Missing — M', value: 'missing', color: '#64748b', bg: '#f1f5f9' },
  { code: 'F', label: 'Filling — F', value: 'filling', color: '#0284c7', bg: '#e0f2fe' },
  { code: 'RCT', label: 'RCT — RCT', value: 'rct', color: '#7c3aed', bg: '#f3e8ff' },
  { code: 'Cr', label: 'Crown — Cr', value: 'crown', color: '#d97706', bg: '#fef3c7' },
  { code: 'Br', label: 'Bridge — Br', value: 'bridge', color: '#059669', bg: '#d1fae5' },
  { code: 'I', label: 'Implant — I', value: 'implant', color: '#0d9488', bg: '#ccfbf1' },
]

export const GINGIVAL_FINDINGS_OPTIONS = [
  'Healthy',
  'Gingivitis',
  'Periodontitis',
  'Enlargement',
  'Recession',
  'Bleeding on Probing',
]

// FDI Tooth Rows
export const FDI_ROWS = {
  upper: [
    [18, 17, 16, 15, 14, 13, 12, 11],
    [21, 22, 23, 24, 25, 26, 27, 28],
  ],
  lower: [
    [48, 47, 46, 45, 44, 43, 42, 41],
    [31, 32, 33, 34, 35, 36, 37, 38],
  ],
}

/**
 * ExaminationOptionGroup — Reusable pill/button selection strip for Extraoral Findings
 */
export function ExaminationOptionGroup({ label, options, value, onChange, readOnly }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const isSelected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              disabled={readOnly}
              className={`choice-pill ${isSelected ? 'is-selected' : ''}`}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: isSelected ? '1px solid var(--color-forest)' : '1px solid #cbd5e1',
                background: isSelected ? 'var(--color-forest)' : '#fff',
                color: isSelected ? '#fff' : '#475569',
                cursor: readOnly ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => onChange && onChange(opt.value)}
            >
              {opt.label} {isSelected ? '✓' : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * ToothTreatmentSelector — Condition / Treatment assigner
 */
export function ToothTreatmentSelector({ selectedTeeth = [], onAssignTreatment, readOnly }) {
  if (selectedTeeth.length === 0) {
    return (
      <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
        Select one or more teeth on the chart to assign conditions or treatments.
      </div>
    )
  }

  return (
    <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-forest)', marginBottom: '8px' }}>
        Assign Condition / Treatment for Selected Teeth ({selectedTeeth.join(', ')}):
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {TOOTH_CONDITIONS.map((cond) => (
          <button
            key={cond.value}
            type="button"
            disabled={readOnly}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${cond.color}`,
              background: cond.bg,
              color: cond.color,
              fontSize: '12px',
              fontWeight: 700,
              cursor: readOnly ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => onAssignTreatment && onAssignTreatment(cond)}
          >
            <span style={{ background: cond.color, color: '#fff', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>
              {cond.code}
            </span>
            {cond.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * ToothTreatmentHistory — Timeline log showing treatment history for a selected tooth
 */
export function ToothTreatmentHistory({ toothNumber, history = [] }) {
  if (!toothNumber) return null

  return (
    <div style={{ padding: '14px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Clock size={15} color="#0284c7" /> Treatment History for Tooth #{toothNumber}
      </div>

      {history.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#64748b' }}>No previous recorded treatments for Tooth #{toothNumber}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {history.map((item, idx) => {
            const isLatest = idx === history.length - 1
            const condObj = TOOTH_CONDITIONS.find((c) => c.value === item.condition || c.code === item.code) || { label: item.condition || item.code, color: '#0f172a', bg: '#f1f5f9' }

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: isLatest ? '#e0f2fe' : '#f8fafc',
                  border: isLatest ? '1px solid #7dd3fc' : '1px solid #f1f5f9',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: condObj.color }}>{condObj.label || item.condition}</span>
                  {item.notes && <span style={{ color: '#64748b', marginLeft: '8px' }}>— {item.notes}</span>}
                </div>
                <div>
                  {isLatest && (
                    <span className="badge badge-success" style={{ fontSize: '10px', marginRight: '6px' }}>
                      Latest
                    </span>
                  )}
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'Recorded'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * ToothChart — Interactive FDI 32-Tooth Chart
 */
export function ToothChart({ toothHistoryMap = {}, selectedTeeth = [], onSelectTooth, readOnly }) {
  const renderTooth = (number) => {
    const isSelected = selectedTeeth.includes(number)
    const history = toothHistoryMap[number] || []
    const latest = history[history.length - 1]
    const condObj = latest ? TOOTH_CONDITIONS.find((c) => c.value === latest.condition || c.code === latest.code) : null

    return (
      <button
        key={number}
        type="button"
        disabled={readOnly}
        style={{
          width: '36px',
          height: '48px',
          borderRadius: '6px',
          border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
          background: isSelected ? '#e0f2fe' : condObj ? condObj.bg : '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center',
          cursor: readOnly ? 'default' : 'pointer',
          padding: '2px',
          position: 'relative',
          boxShadow: isSelected ? '0 0 0 2px rgba(2,132,199,0.2)' : 'none',
          transition: 'all 0.15s ease',
        }}
        onClick={() => onSelectTooth && onSelectTooth(number)}
        title={`Tooth #${number} ${latest ? `(${latest.condition})` : ''}`}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>{number}</span>
        {condObj && (
          <span style={{ fontSize: '10px', fontWeight: 900, color: condObj.color, marginTop: '2px' }}>
            {condObj.code}
          </span>
        )}
      </button>
    )
  }

  return (
    <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', overflowX: 'auto' }}>
      <div style={{ minWidth: '580px' }}>
        {/* Upper Arch */}
        <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
          UPPER ARCH (Maxillary)
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {FDI_ROWS.upper[0].map(renderTooth)}
          </div>
          <div style={{ width: '2px', background: '#cbd5e1', alignSelf: 'stretch' }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            {FDI_ROWS.upper[1].map(renderTooth)}
          </div>
        </div>

        {/* Lower Arch */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {FDI_ROWS.lower[0].map(renderTooth)}
          </div>
          <div style={{ width: '2px', background: '#cbd5e1', alignSelf: 'stretch' }} />
          <div style={{ display: 'flex', gap: '4px' }}>
            {FDI_ROWS.lower[1].map(renderTooth)}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
          LOWER ARCH (Mandibular)
        </div>
      </div>
    </div>
  )
}

/**
 * ClinicalExamination — Master Component for Doctor Consultation
 */
export default function ClinicalExamination({
  data = {},
  onChange,
  readOnly = false,
}) {
  const [selectedTeeth, setSelectedTeeth] = useState([])

  const extraoral = data.extraoral || {
    facialSymmetry: 'normal',
    tmj: 'normal',
    lymphNodes: 'normal',
    swelling: 'absent',
  }

  const softTissue = data.softTissue || {
    labialBuccalMucosa: '',
    tongue: '',
    floorOfMouth: '',
    gingiva: '',
    hardPalate: '',
    softPalate: '',
  }

  const gingivalFindings = Array.isArray(data.gingivalFindings) ? data.gingivalFindings : []
  const toothHistoryMap = data.toothHistoryMap || {}

  const handleExtraoralChange = (field, val) => {
    if (readOnly || !onChange) return
    onChange({
      ...data,
      extraoral: { ...extraoral, [field]: val },
    })
  }

  const handleSoftTissueChange = (field, val) => {
    if (readOnly || !onChange) return
    onChange({
      ...data,
      softTissue: { ...softTissue, [field]: val },
    })
  }

  const toggleGingivalFinding = (finding) => {
    if (readOnly || !onChange) return
    const next = gingivalFindings.includes(finding)
      ? gingivalFindings.filter((f) => f !== finding)
      : [...gingivalFindings, finding]
    onChange({
      ...data,
      gingivalFindings: next,
    })
  }

  const handleSelectTooth = (toothNumber) => {
    if (selectedTeeth.includes(toothNumber)) {
      setSelectedTeeth(selectedTeeth.filter((t) => t !== toothNumber))
    } else {
      setSelectedTeeth([...selectedTeeth, toothNumber])
    }
  }

  const handleAssignTreatment = (cond) => {
    if (readOnly || !onChange || selectedTeeth.length === 0) return
    const nextMap = { ...toothHistoryMap }

    selectedTeeth.forEach((tNum) => {
      const existing = Array.isArray(nextMap[tNum]) ? [...nextMap[tNum]] : []
      existing.push({
        condition: cond.value,
        code: cond.code,
        date: new Date().toISOString(),
      })
      nextMap[tNum] = existing
    })

    onChange({
      ...data,
      toothHistoryMap: nextMap,
    })
  }

  const activeTooth = selectedTeeth.length > 0 ? selectedTeeth[selectedTeeth.length - 1] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── 1. EXTRAORAL EXAMINATION ── */}
      <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Stethoscope size={18} /> 1. Extraoral Examination
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <ExaminationOptionGroup
            label="Facial Symmetry"
            options={[{ value: 'normal', label: 'Normal' }, { value: 'asymmetrical', label: 'Asymmetrical' }]}
            value={extraoral.facialSymmetry}
            onChange={(val) => handleExtraoralChange('facialSymmetry', val)}
            readOnly={readOnly}
          />
          <ExaminationOptionGroup
            label="TMJ (Temporomandibular Joint)"
            options={[{ value: 'normal', label: 'Normal' }, { value: 'clicking', label: 'Clicking' }, { value: 'painful', label: 'Painful' }]}
            value={extraoral.tmj}
            onChange={(val) => handleExtraoralChange('tmj', val)}
            readOnly={readOnly}
          />
          <ExaminationOptionGroup
            label="Lymph Nodes"
            options={[{ value: 'normal', label: 'Normal' }, { value: 'palpable', label: 'Palpable' }, { value: 'tender', label: 'Tender' }]}
            value={extraoral.lymphNodes}
            onChange={(val) => handleExtraoralChange('lymphNodes', val)}
            readOnly={readOnly}
          />
          <ExaminationOptionGroup
            label="Swelling"
            options={[{ value: 'absent', label: 'Absent' }, { value: 'present', label: 'Present' }]}
            value={extraoral.swelling}
            onChange={(val) => handleExtraoralChange('swelling', val)}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* ── 2. INTRAORAL EXAMINATION ── */}
      <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Stethoscope size={18} /> 2. Intraoral Examination & Soft Tissue
        </h3>

        {/* Soft Tissue Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Labial / Buccal Mucosa</label>
            <input
              type="text"
              className="form-control"
              style={{ fontSize: '13px' }}
              value={softTissue.labialBuccalMucosa}
              onChange={(e) => handleSoftTissueChange('labialBuccalMucosa', e.target.value)}
              placeholder="e.g. Normal, ulcer, lesion"
              disabled={readOnly}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Tongue</label>
            <input
              type="text"
              className="form-control"
              style={{ fontSize: '13px' }}
              value={softTissue.tongue}
              onChange={(e) => handleSoftTissueChange('tongue', e.target.value)}
              placeholder="e.g. Normal, coated"
              disabled={readOnly}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Floor of Mouth</label>
            <input
              type="text"
              className="form-control"
              style={{ fontSize: '13px' }}
              value={softTissue.floorOfMouth}
              onChange={(e) => handleSoftTissueChange('floorOfMouth', e.target.value)}
              placeholder="e.g. Normal"
              disabled={readOnly}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Gingiva</label>
            <input
              type="text"
              className="form-control"
              style={{ fontSize: '13px' }}
              value={softTissue.gingiva}
              onChange={(e) => handleSoftTissueChange('gingiva', e.target.value)}
              placeholder="e.g. Pink, firm"
              disabled={readOnly}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Hard Palate</label>
            <input
              type="text"
              className="form-control"
              style={{ fontSize: '13px' }}
              value={softTissue.hardPalate}
              onChange={(e) => handleSoftTissueChange('hardPalate', e.target.value)}
              placeholder="e.g. Normal"
              disabled={readOnly}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Soft Palate</label>
            <input
              type="text"
              className="form-control"
              style={{ fontSize: '13px' }}
              value={softTissue.softPalate}
              onChange={(e) => handleSoftTissueChange('softPalate', e.target.value)}
              placeholder="e.g. Normal"
              disabled={readOnly}
            />
          </div>
        </div>

        {/* Gingival Findings Multi-Select Pills */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            Gingival Findings (Multiple Selectable):
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {GINGIVAL_FINDINGS_OPTIONS.map((finding) => {
              const active = gingivalFindings.includes(finding)
              return (
                <button
                  key={finding}
                  type="button"
                  disabled={readOnly}
                  className={`choice-pill ${active ? 'is-selected' : ''}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: active ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    background: active ? '#0284c7' : '#fff',
                    color: active ? '#fff' : '#334155',
                    cursor: readOnly ? 'default' : 'pointer',
                  }}
                  onClick={() => toggleGingivalFinding(finding)}
                >
                  {finding} {active ? '✓' : ''}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 3 & 4 & 5. HARD TISSUE EXAMINATION & FDI TOOTH CHART ── */}
      <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Stethoscope size={18} /> 3. Hard Tissue Examination (FDI Tooth Chart)
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
          Click teeth on the chart to select, assign conditions, and review treatment history logs.
        </p>

        {/* Tooth Chart */}
        <ToothChart
          toothHistoryMap={toothHistoryMap}
          selectedTeeth={selectedTeeth}
          onSelectTooth={handleSelectTooth}
          readOnly={readOnly}
        />

        {/* Treatment Assigner */}
        <ToothTreatmentSelector
          selectedTeeth={selectedTeeth}
          onAssignTreatment={handleAssignTreatment}
          readOnly={readOnly}
        />

        {/* Tooth History Log */}
        {activeTooth && (
          <ToothTreatmentHistory
            toothNumber={activeTooth}
            history={toothHistoryMap[activeTooth] || []}
          />
        )}
      </div>

    </div>
  )
}
