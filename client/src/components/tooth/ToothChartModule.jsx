import { useCallback, useEffect, useState } from 'react'
import ToothChart from './ToothChart'
import ToothDetailPanel from './ToothDetailPanel'
import { getToothChart } from '../../services/toothChartService'

export default function ToothChartModule({
  patientId,
  consultationId,
  visitId,
  readOnly = false,
  showLegend = true,
  compact = false,
}) {
  const [teeth, setTeeth] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError('')
    try {
      const res = await getToothChart(patientId)
      setTeeth(res.items || [])
    } catch (err) {
      setError(err.message || 'Unable to load tooth chart.')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await Promise.resolve()
      if (cancelled) return
      await load()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [load])

  if (!patientId) {
    return <p className="muted">Select a patient to view the tooth chart.</p>
  }

  return (
    <div className={`tooth-chart-module${compact ? ' is-compact' : ''}`}>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p className="muted">Loading tooth chart…</p>
      ) : (
        <ToothChart
          teeth={teeth}
          selected={selected}
          onSelect={setSelected}
          disabled={readOnly}
          showLegend={showLegend}
        />
      )}

      {selected && (
        <ToothDetailPanel
          patientId={patientId}
          toothNumber={selected}
          onClose={() => setSelected(null)}
          readOnly={readOnly}
          visitId={visitId}
          consultationId={consultationId}
          onChange={() => load()}
        />
      )}
    </div>
  )
}