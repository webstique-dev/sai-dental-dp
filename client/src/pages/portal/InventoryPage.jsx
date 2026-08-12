import { useEffect, useState, useMemo } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { SectionCard, Field } from '../../components/ui/fields'
import ConfirmationDialog from '../../components/common/ConfirmationDialog'
import { SkeletonTable } from '../../components/common/skeleton'
import { Modal } from '../../components/common/modal'
import { useNotification } from '../../components/common/notification'
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
  const notify = useNotification()
  const { user } = useAuth()
  const canManage = user.role === 'admin' || user.role === 'pharmacy'

  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [movements, setMovements] = useState(null)
  const [confirmOut, setConfirmOut] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [stockModal, setStockModal] = useState({ open: false, med: null, dir: 'in', action: 'purchase-in', qty: '', notes: '' })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const params = {}
        if (stockFilter) params[stockFilter] = 'true'
        if (categoryFilter) params.category = categoryFilter
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
  }, [stockFilter, categoryFilter])

  // Dependent Supplier Filter Options based on selected Category
  const availableSuppliers = useMemo(() => {
    const list = categoryFilter
      ? medicines.filter((m) => m.category === categoryFilter)
      : medicines
    const set = new Set(list.map((m) => m.supplier).filter(Boolean))
    return Array.from(set)
  }, [medicines, categoryFilter])

  // Filtered Medicines matching all active filters
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = m.name?.toLowerCase().includes(q)
        const matchesGen = m.genericName?.toLowerCase().includes(q)
        const matchesBatch = m.batchNumber?.toLowerCase().includes(q)
        const matchesSupp = m.supplier?.toLowerCase().includes(q)
        if (!matchesName && !matchesGen && !matchesBatch && !matchesSupp) return false
      }
      if (categoryFilter && m.category !== categoryFilter) return false
      if (supplierFilter && m.supplier !== supplierFilter) return false
      return true
    })
  }, [medicines, searchQuery, categoryFilter, supplierFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('')
    setStockFilter('')
    setSupplierFilter('')
  }

  const reload = async () => {
    const params = {}
    if (stockFilter) params[stockFilter] = 'true'
    if (categoryFilter) params.category = categoryFilter
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
        notify.success(`Medicine "${form.name}" updated successfully!`)
      } else {
        await createMedicine(form)
        notify.success(`Medicine "${form.name}" added to inventory!`)
      }
      setShowForm(false)
      setEditing(null)
      await reload()
    } catch (err) {
      const errMsg = err.message || 'Unable to save medicine.'
      setError(errMsg)
      notify.error(errMsg)
    } finally {
      setSaving(false)
    }
  }

  const openStockModal = (med, dir, action) => {
    setStockModal({ open: true, med, dir, action, qty: '', notes: '' })
  }

  const handleStockModalSubmit = async (e) => {
    e.preventDefault()
    const n = Number(stockModal.qty)
    if (!Number.isFinite(n) || n <= 0) {
      notify.warning('Please enter a valid positive quantity.')
      return
    }
    const { med, dir, action, notes } = stockModal

    if (dir === 'in') {
      try {
        await stockIn(med.id, { quantity: n, action, notes })
        notify.success(`Added ${n} units of stock to ${med.name}.`)
        setStockModal({ open: false, med: null, dir: 'in', action: 'purchase-in', qty: '', notes: '' })
        await reload()
      } catch (err) {
        const errMsg = err.message || 'Unable to update stock.'
        setError(errMsg)
        notify.error(errMsg)
      }
      return
    }

    setConfirmOut({ med, quantity: n, action, notes })
    setStockModal({ open: false, med: null, dir: 'in', action: 'purchase-in', qty: '', notes: '' })
  }

  const runRemoveConfirm = async () => {
    if (!confirmOut) return
    setRemoving(true)
    setError('')
    try {
      await stockOut(confirmOut.med.id, {
        quantity: confirmOut.quantity,
        action: confirmOut.action,
        notes: confirmOut.notes,
      })
      notify.success(`Removed ${confirmOut.quantity} units of stock from ${confirmOut.med.name}.`)
      setConfirmOut(null)
      await reload()
    } catch (err) {
      const errMsg = err.message || 'Unable to remove stock.'
      setError(errMsg)
      notify.error(errMsg)
      setConfirmOut(null)
    } finally {
      setRemoving(false)
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
    <div className="portal-page">
      <div className="portal-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1>Medicine Inventory</h1>
          <p>Stock levels, reorder points and expiry tracking. Every movement is recorded in the stock ledger.</p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (showForm && !editing ? setShowForm(false) : startCreate())}
            style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {showForm && !editing ? 'Cancel' : <><Plus size={14} /> New Medicine</>}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert" style={{ background: 'rgba(217,67,67,0.08)', border: '1px solid rgba(217,67,67,0.3)', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '18px' }} onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search name, generic, batch# or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setSupplierFilter('')
            }}
            className="form-control"
            style={{ height: '38px', padding: '0 12px', minWidth: '140px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="">All Categories</option>
            {MEDICINE_CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="form-control"
            style={{ height: '38px', padding: '0 12px', minWidth: '130px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="">All Status</option>
            <option value="lowStock">Low stock</option>
            <option value="outOfStock">Out of stock</option>
            <option value="expiringSoon">Expiring soon</option>
            <option value="expired">Expired</option>
          </select>

          {availableSuppliers.length > 0 && (
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="form-control"
              style={{ height: '38px', padding: '0 12px', minWidth: '140px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="">All Suppliers</option>
              {availableSuppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {(searchQuery || categoryFilter || stockFilter || supplierFilter) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '38px' }}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* New/Edit Medicine Form */}
      {showForm && (
        <div className="card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#1a3c2b' }}>
            {editing ? `Edit — ${editing.name}` : 'Add New Medicine'}
          </h3>
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
                    <option key={o.value} value={o.value}>{o.label}</option>
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
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim() || form.quantity === ''}>
                {saving ? 'Saving…' : editing ? 'Update Medicine' : 'Add Medicine'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stock Ledger View */}
      {movements && (
        <div className="card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a3c2b' }}>
              Stock Ledger — {movements.medicine.name}
            </h3>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setMovements(null)}>
              Back to inventory
            </button>
          </div>
          {movements.transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No stock movements recorded.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Movement</th>
                    <th style={{ padding: '10px' }}>Action</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Balance After</th>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.transactions.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>
                        <span
                          className="badge"
                          style={{
                            background: t.quantityChange > 0 ? 'rgba(5,150,105,0.1)' : 'rgba(217,67,67,0.1)',
                            color: t.quantityChange > 0 ? '#059669' : '#dc2626',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '12px',
                          }}
                        >
                          {t.quantityChange > 0 ? `+${t.quantityChange} In` : `${t.quantityChange} Out`}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textTransform: 'capitalize' }}>{t.action?.replace(/-/g, ' ')}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{t.balanceAfter}</td>
                      <td style={{ padding: '10px', color: '#64748b', fontSize: '12px' }}>{fmtDate(t.createdAt)}</td>
                      <td style={{ padding: '10px', color: '#64748b', fontSize: '12px' }}>{t.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Medicine Inventory Table */}
      <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a3c2b' }}>
            Medicines ({filteredMedicines.length})
          </h2>
        </div>

        {loading && medicines.length === 0 ? (
          <SkeletonTable rows={6} columns={6} />
        ) : filteredMedicines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
            <p style={{ margin: '0 0 12px 0' }}>No medicine records match your search or selected filters.</p>
            {(searchQuery || categoryFilter || stockFilter || supplierFilter) && (
              <button type="button" className="btn btn-sm btn-outline" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Medicine</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Stock</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map((m) => {
                  const alerts = stockAlertLabels(m)
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Medicine Name + Details */}
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {m.name}
                          {m.genericName && <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '6px' }}>({m.genericName})</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                          {m.batchNumber ? `Batch ${m.batchNumber}` : ''}
                          {m.expiryDate ? `${m.batchNumber ? ' · ' : ''}Exp ${fmtDate(m.expiryDate)}` : ''}
                          {m.supplier ? `${(m.batchNumber || m.expiryDate) ? ' · ' : ''}${m.supplier}` : ''}
                        </div>
                      </td>
                      {/* Category */}
                      <td style={{ padding: '10px' }}>
                        <span style={{ background: 'rgba(26,60,43,0.06)', color: '#1a3c2b', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
                          {MEDICINE_CATEGORY_BY_VALUE[m.category] || m.category}
                        </span>
                      </td>
                      {/* Stock */}
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '16px', color: m.quantity <= m.reorderLevel ? (m.quantity === 0 ? '#dc2626' : '#d97706') : '#1e293b' }}>
                          {m.quantity}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Reorder at {m.reorderLevel}</div>
                      </td>
                      {/* Price */}
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatRupees(m.sellPrice)}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{formatRupees(m.costPrice)} cost</div>
                      </td>
                      {/* Status Alerts */}
                      <td style={{ padding: '10px' }}>
                        {alerts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {alerts.map((a) => (
                              <span
                                key={a}
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: a.toLowerCase().includes('out') ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)',
                                  color: a.toLowerCase().includes('out') ? '#dc2626' : '#d97706',
                                }}
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>OK</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button type="button" className="btn btn-sm btn-outline" onClick={() => showHistory(m)} title="View stock ledger">
                            Ledger
                          </button>
                          {canManage && (
                            <>
                              <button type="button" className="btn btn-sm btn-outline" onClick={() => openStockModal(m, 'in', 'purchase-in')} style={{ color: '#059669', borderColor: '#059669' }} title="Add stock">
                                + In
                              </button>
                              <button type="button" className="btn btn-sm btn-outline" onClick={() => openStockModal(m, 'out', 'wastage-out')} style={{ color: '#dc2626', borderColor: '#dc2626' }} title="Remove stock">
                                − Out
                              </button>
                              <button type="button" className="btn btn-sm btn-outline" onClick={() => startEdit(m)} title="Edit medicine">
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal (replaces browser prompt) */}
      <Modal
        open={stockModal.open}
        onClose={() => setStockModal({ open: false, med: null, dir: 'in', action: 'purchase-in', qty: '', notes: '' })}
        title={stockModal.dir === 'in' ? `Add Stock — ${stockModal.med?.name || ''}` : `Remove Stock — ${stockModal.med?.name || ''}`}
        maxWidth="480px"
      >
        <form onSubmit={handleStockModalSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Quantity *</label>
            <input
              type="number"
              min="1"
              step="1"
              required
              autoFocus
              className="form-control"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={stockModal.qty}
              onChange={(e) => setStockModal({ ...stockModal, qty: e.target.value })}
              placeholder="Enter number of units"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Notes (optional)</label>
            <input
              type="text"
              className="form-control"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={stockModal.notes}
              onChange={(e) => setStockModal({ ...stockModal, notes: e.target.value })}
              placeholder="e.g. Batch shipment intake, damage wastage"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStockModal({ open: false, med: null, dir: 'in', action: 'purchase-in', qty: '', notes: '' })}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${stockModal.dir === 'in' ? 'btn-primary' : 'btn-danger'}`}
              disabled={!stockModal.qty || Number(stockModal.qty) <= 0}
            >
              {stockModal.dir === 'in' ? 'Add Stock' : 'Proceed to Remove'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(confirmOut)}
        title="Remove Stock?"
        message={
          confirmOut
            ? `Are you sure you want to remove ${confirmOut.quantity} unit${confirmOut.quantity === 1 ? '' : 's'} of "${confirmOut.med.name}" from stock? This movement is recorded in the stock ledger and cannot be undone.`
            : ''
        }
        confirmText="Remove Stock"
        cancelText="Keep"
        variant="danger"
        loading={removing}
        loadingText="Removing…"
        onConfirm={runRemoveConfirm}
        onCancel={() => setConfirmOut(null)}
      />
    </div>
  )
}