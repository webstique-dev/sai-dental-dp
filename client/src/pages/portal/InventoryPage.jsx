import { useEffect, useState } from 'react'
import { SectionCard, Field } from '../../components/ui/fields'
import {
  listMedicines,
  createMedicine,
  updateMedicine,
  stockIn,
  stockOut,
  medicineTransactions,
} from '../../services/pharmacyService'
import {
  MEDICINE_CATEGORY_OPTIONS,
  MEDICINE_CATEGORY_BY_VALUE,
  formatRupees,
  stockAlertLabels,
  fmtDate,
} from '../../constants/options'
import useAuth from '../../hooks/useAuth'

const emptyForm = {
  name: '',
  genericName: '',
  category: 'other',
  batchNumber: '',
  expiryDate: '',
  quantity: '',
  reorderLevel: '10',
  costPrice: '',
  sellPrice: '',
  supplier: '',
  isActive: true,
}

export default function InventoryPage() {
  const { user } = useAuth()
  const canManage = user.role === 'admin' || user.role === 'pharmacy'

  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [movements, setMovements] = useState(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const params = {}
        if (filter) params[filter] = 'true'
        const res = await listMedicines(params)
        if (!cancelled) setMedicines(res.medicines || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load inventory.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [filter])

  const reload = async () => {
    const params = {}
    if (filter) params[filter] = 'true'
    const res = await listMedicines(params)
    setMedicines(res.medicines || [])
  }

  const startCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const startEdit = (m) => {
    setEditing(m)
    setForm({
      name: m.name,
      genericName: m.genericName || '',
      category: m.category,
      batchNumber: m.batchNumber || '',
      expiryDate: m.expiryDate ? String(m.expiryDate).slice(0, 10) : '',
      quantity: m.quantity,
      reorderLevel: m.reorderLevel,
      costPrice: m.costPrice,
      sellPrice: m.sellPrice,
      supplier: m.supplier || '',
      isActive: m.isActive,
    })
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateMedicine(editing.id, form)
      } else {
        await createMedicine(form)
      }
      setShowForm(false)
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err.message || 'Unable to save medicine.')
    } finally {
      setSaving(false)
    }
  }

  const moveStock = async (med, dir, action) => {
    const qty = window.prompt(`Enter quantity to ${dir === 'in' ? 'add to' : 'remove from'} ${med.name}:`, '')
    const n = Number(qty)
    if (!Number.isFinite(n) || n <= 0) return
    setError('')
    try {
      if (dir === 'in') {
        await stockIn(med.id, { quantity: n, action, notes: window.prompt('Notes (optional):') || '' })
      } else {
        await stockOut(med.id, { quantity: n, action, notes: window.prompt('Notes (optional):') || '' })
      }
      await reload()
    } catch (err) {
      setError(err.message || 'Unable to update stock.')
    }
  }

  const showHistory = async (med) => {
    setError('')
    try {
      const res = await medicineTransactions(med.id)
      setMovements({ medicine: med, transactions: res.transactions || [] })
    } catch (err) {
      setError(err.message || 'Unable to load stock history.')
    }
  }

  return (
    <div>
      <div className="portal-heading">
        <h1>Medicine Inventory</h1>
        <p>Stock levels, reorder points and expiry tracking. Every movement is recorded in the stock ledger.</p>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <div className="billing-toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="search-input filter-select">
          <option value="">All medicines</option>
          <option value="lowStock">Low stock</option>
          <option value="outOfStock">Out of stock</option>
          <option value="expiringSoon">Expiring soon</option>
          <option value="expired">Expired</option>
        </select>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => (showForm && !editing ? setShowForm(false) : startCreate())}>
            {showForm && !editing ? 'Cancel' : showForm && editing ? 'New medicine' : '+ New medicine'}
          </button>
        )}
      </div>

      {showForm && (
        <SectionCard title={editing ? `Edit ${editing.name}` : 'New medicine'}>
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="Name *">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Generic name">
                <input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} />
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {MEDICINE_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Batch number">
                <input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
              </Field>
              <Field label="Expiry date">
                <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </Field>
              <Field label="Quantity *">
                <input type="number" min="0" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </Field>
              <Field label="Reorder level">
                <input type="number" min="0" step="1" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
              </Field>
              <Field label="Cost price (₹)">
                <input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
              </Field>
              <Field label="Selling price (₹)">
                <input type="number" min="0" step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
              </Field>
              <Field label="Supplier">
                <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </Field>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim() || form.quantity === ''}>
                {saving ? 'Saving…' : editing ? 'Update medicine' : 'Add medicine'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {movements && (
        <SectionCard title={`Stock ledger — ${movements.medicine.name}`}>
          <div className="form-actions">
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setMovements(null)}>
              Back to inventory
            </button>
          </div>
          {movements.transactions.length === 0 ? (
            <p className="state-card">No stock movements recorded.</p>
          ) : (
            <div className="inventory-list">
              {movements.transactions.map((t) => (
                <div className="inventory-row" key={t.id}>
                  <span className={`status-badge ${t.quantityChange > 0 ? 'status-finalized' : 'status-cancelled'}`}>
                    {t.quantityChange > 0 ? `In +${t.quantityChange}` : `Out ${t.quantityChange}`}
                  </span>
                  <span className="muted">
                    {t.action} · balance {t.balanceAfter} · {fmtDate(t.createdAt)}
                  </span>
                  {t.notes && <span className="muted">{t.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {loading ? (
        <p className="muted">Loading inventory…</p>
      ) : medicines.length === 0 ? (
        <p className="state-card">No medicines match this view.</p>
      ) : (
        <div className="inventory-list">
          {medicines.map((m) => {
            const alerts = stockAlertLabels(m)
            return (
              <div className="inventory-row" key={m.id}>
                <div className="inventory-main">
                  <span className="inv-name">
                    {m.name}
                    {m.genericName ? <span className="muted"> ({m.genericName})</span> : ''}
                  </span>
                  <span className="muted">
                    {MEDICINE_CATEGORY_BY_VALUE[m.category] || m.category}
                    {m.batchNumber ? ` · Batch ${m.batchNumber}` : ''}
                    {m.expiryDate ? ` · Exp ${fmtDate(m.expiryDate)}` : ''}
                    {m.supplier ? ` · ${m.supplier}` : ''}
                  </span>
                </div>
                <div className="inventory-stock">
                  <span className="inv-qty">Qty {m.quantity}</span>
                  <span className="muted">Reorder at {m.reorderLevel}</span>
                </div>
                <div className="inventory-price">
                  <span>{formatRupees(m.sellPrice)}</span>
                  <span className="muted">{formatRupees(m.costPrice)} cost</span>
                </div>
                <div className="inventory-actions">
                  {alerts.length > 0 && (
                    <span className="status-badge status-cancelled">{alerts.join(', ')}</span>
                  )}
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => showHistory(m)}>
                    Ledger
                  </button>
                  {canManage && (
                    <>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => moveStock(m, 'in', 'purchase-in')}>
                        + Stock
                      </button>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => moveStock(m, 'out', 'wastage-out')}>
                        − Stock
                      </button>
                      <button type="button" className="btn btn-sm btn-outline" onClick={() => startEdit(m)}>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}