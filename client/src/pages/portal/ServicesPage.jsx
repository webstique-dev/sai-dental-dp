import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { SectionCard, Field } from '../../components/ui/fields'
import { listServices, createService, updateService } from '../../services/serviceService'
import { SERVICE_CATEGORY_OPTIONS, SERVICE_CATEGORY_BY_VALUE, formatRupees } from '../../constants/options'
import useAuth from '../../hooks/useAuth'

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const role = user ? user.role : ''
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', category: 'procedure', unitPrice: '', taxPercent: '', description: '', isActive: true })
  const [saving, setSaving] = useState(false)

  const canManage = role === 'admin'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await listServices()
        if (!cancelled) setServices(res.services || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load services.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const reload = async () => {
    const res = await listServices()
    setServices(res.services || [])
  }

  const startCreate = () => {
    setEditing(null)
    setForm({ name: '', code: '', category: 'procedure', unitPrice: '', taxPercent: '', description: '', isActive: true })
    setShowForm(true)
  }

  const startEdit = (s) => {
    setEditing(s)
    setForm({
      name: s.name,
      code: s.code,
      category: s.category,
      unitPrice: s.unitPrice,
      taxPercent: s.taxPercent,
      description: s.description || '',
      isActive: s.isActive,
    })
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateService(editing.id, form)
      } else {
        await createService(form)
      }
      setShowForm(false)
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err.message || 'Unable to save service.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="portal-heading">
        <h1>Service Catalog</h1>
        <p>Master price list. Invoices snapshot these prices the moment a line is added, so future price edits never change past bills.</p>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {canManage && (
        <div className="billing-toolbar">
          <button type="button" className="btn btn-primary" onClick={() => (showForm && !editing ? setShowForm(false) : startCreate())}>
            {showForm && !editing ? 'Cancel' : showForm && editing ? 'New service' : <><Plus size={12} className="mr-1" /> New service</>}
          </button>
        </div>
      )}

      {showForm && (
        <SectionCard title={editing ? `Edit ${editing.name}` : 'New service'}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="Name *">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Code" hint="Auto-generated if empty">
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {SERVICE_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Unit price (₹) *">
                <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </Field>
              <Field label="Tax %">
                <input type="number" min="0" max="100" step="0.01" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: e.target.value })} />
              </Field>
              <Field label="Active">
                <select value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
            </div>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim() || form.unitPrice === ''}>
                {saving ? 'Saving…' : editing ? 'Update service' : 'Create service'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <p className="muted">Loading services…</p>
      ) : services.length === 0 ? (
        <p className="state-card">No services in the catalog yet.</p>
      ) : (
        <div className="inv-list">
          {services.map((s) => (
            <div className="inv-card" key={s.id}>
              <div className="inv-card-head">
                <div className="inv-head-main">
                  <span className="plan-number">{s.code}</span>
                  <span className="inv-name">{s.name}</span>
                  <span className="muted">
                    {SERVICE_CATEGORY_BY_VALUE[s.category] || s.category}
                    {s.taxPercent > 0 ? ` · Tax ${s.taxPercent}%` : ''}
                  </span>
                </div>
                <div className="billing-head-right">
                  <b>{formatRupees(s.unitPrice)}</b>
                  {!s.isActive && <span className="status-badge status-cancelled">Inactive</span>}
                  {canManage && (
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => startEdit(s)}>
                      Edit
                    </button>
                  )}
                </div>
              </div>
              {s.description && <p className="muted">{s.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}