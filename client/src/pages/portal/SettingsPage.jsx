import { useState, useEffect } from 'react'
import { Building, Save, Database, ShieldAlert, Download, Clock, Plus, Trash2 } from 'lucide-react'
import {
  getClinicSettings,
  updateClinicSettings,
  exportDatabaseBackup,
  listAuditLogs,
} from '../../services/settingsService'
import { TextField } from '../../components/ui/fields'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'audit' | 'backup'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    clinicName: 'Sai Dental Clinic',
    tagline: 'Advanced Dental Care & Implant Center',
    phone: '+91 98400 12345',
    email: 'info@saidental.com',
    address: '123 Healthcare Avenue, Anna Nagar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600040',
    workingHours: 'Mon - Sat: 9:00 AM - 8:00 PM, Sun: 10:00 AM - 1:00 PM',
    slotDurationMinutes: 30,
    branches: [
      { name: 'Main Branch - Anna Nagar', address: 'Anna Nagar, Chennai', phone: '+91 98400 12345', isPrimary: true },
    ],
  })

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Backup State
  const [exporting, setExporting] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getClinicSettings()
      if (res.settings) {
        setForm({
          clinicName: res.settings.clinicName || 'Sai Dental Clinic',
          tagline: res.settings.tagline || '',
          phone: res.settings.phone || '',
          email: res.settings.email || '',
          address: res.settings.address || '',
          city: res.settings.city || '',
          state: res.settings.state || '',
          pincode: res.settings.pincode || '',
          workingHours: res.settings.workingHours || '',
          slotDurationMinutes: res.settings.slotDurationMinutes || 30,
          branches: res.settings.branches || [],
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to load clinic settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await listAuditLogs({ limit: 100 })
      setAuditLogs(res.logs || [])
    } catch (err) {
      setError(err.message || 'Failed to load system audit logs')
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'audit') fetchLogs()
  }, [activeTab])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    try {
      await updateClinicSettings(form)
      setNotice('Clinic profile and settings updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update clinic settings')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBackup = async () => {
    setExporting(true)
    setError('')
    setNotice('')
    try {
      const res = await exportDatabaseBackup()
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `sai-dental-backup-${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      setNotice('Database JSON backup downloaded successfully!')
    } catch (err) {
      setError(err.message || 'Failed to generate database backup')
    } finally {
      setExporting(false)
    }
  }

  const handleAddBranch = () => {
    setForm((f) => ({
      ...f,
      branches: [...f.branches, { name: '', address: '', phone: '', isPrimary: false }],
    }))
  }

  const handleRemoveBranch = (idx) => {
    setForm((f) => ({
      ...f,
      branches: f.branches.filter((_, i) => i !== idx),
    }))
  }

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Clinic Settings, Access Audit & System Maintenance</h1>
          <p>Configure clinic branding, working hours, multi-branch setup, view system audit logs, and trigger database backups</p>
        </div>
      </div>

      {notice && <div className="form-success mb-4">{notice}</div>}
      {error && <div className="form-error mb-4" role="alert">{error}</div>}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('profile')}
        >
          <Building size={16} className="mr-1 inline" /> Clinic Profile & Settings
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('audit')}
        >
          <ShieldAlert size={16} className="mr-1 inline" /> System Audit Logs
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('backup')}
        >
          <Database size={16} className="mr-1 inline" /> Database Backup & Restore
        </button>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveSettings} className="card" style={{ background: '#fff', padding: '24px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>Clinic Profile Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <TextField label="Clinic Name *" value={form.clinicName} onChange={(v) => setForm((f) => ({ ...f, clinicName: v }))} />
            <TextField label="Tagline / Subtitle" value={form.tagline} onChange={(v) => setForm((f) => ({ ...f, tagline: v }))} />
            <TextField label="Phone Number" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <TextField label="Email Address" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            <TextField label="Street Address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
            <TextField label="City" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
            <TextField label="State" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
            <TextField label="Pincode" value={form.pincode} onChange={(v) => setForm((f) => ({ ...f, pincode: v }))} />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>Operational Configuration</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <TextField label="Working Hours Display" value={form.workingHours} onChange={(v) => setForm((f) => ({ ...f, workingHours: v }))} />
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Default Appointment Slot Duration (minutes)</label>
              <input
                type="number"
                className="form-control"
                style={{ width: '100%', marginTop: '4px' }}
                value={form.slotDurationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, slotDurationMinutes: Number(e.target.value) || 30 }))}
                min={10}
                max={120}
              />
            </div>
          </div>

          {/* Multi-Branch Management */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Clinic Branches</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddBranch}>
                <Plus size={14} className="mr-1 inline" /> Add Branch
              </button>
            </div>

            {form.branches.map((b, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Branch Name"
                  value={b.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm((f) => {
                      const nb = [...f.branches]
                      nb[idx].name = name
                      return { ...f, branches: nb }
                    })
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Address"
                  value={b.address}
                  onChange={(e) => {
                    const address = e.target.value
                    setForm((f) => {
                      const nb = [...f.branches]
                      nb[idx].address = address
                      return { ...f, branches: nb }
                    })
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Phone"
                  value={b.phone}
                  onChange={(e) => {
                    const phone = e.target.value
                    setForm((f) => {
                      const nb = [...f.branches]
                      nb[idx].phone = phone
                      return { ...f, branches: nb }
                    })
                  }}
                />
                {form.branches.length > 1 && (
                  <button type="button" className="btn btn-ghost text-danger btn-sm" onClick={() => handleRemoveBranch(idx)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} className="mr-1 inline" /> {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'audit' && (
        <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: '#1e293b' }}>System Audit Logs</h2>
          {logsLoading ? (
            <div className="py-8 text-center">Loading audit log entries...</div>
          ) : auditLogs.length === 0 ? (
            <p className="text-muted">No audit logs recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Timestamp</th>
                    <th style={{ padding: '10px' }}>User / Role</th>
                    <th style={{ padding: '10px' }}>Action</th>
                    <th style={{ padding: '10px' }}>Entity</th>
                    <th style={{ padding: '10px' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id || log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', color: '#64748b' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>
                        {log.user ? `${log.user.name} (${log.user.role})` : 'System'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge ${log.action === 'create' ? 'badge-success' : log.action === 'delete' ? 'badge-danger' : 'badge-subtle'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textTransform: 'capitalize' }}>{log.entity}</td>
                      <td style={{ padding: '10px' }}>{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'backup' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card" style={{ background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={20} color="#0284c7" /> One-Click Database Export
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
              Generate and download a complete JSON backup dump containing all 19 system collections (patients, appointments, consultations, prescriptions, invoices, stock batches, dispensings, and user accounts).
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadBackup}
              disabled={exporting}
            >
              <Database size={16} className="mr-1 inline" /> {exporting ? 'Exporting JSON Dump...' : 'Download Full JSON Backup'}
            </button>
          </div>

          <div className="card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#1e293b' }}>Database Restore Guidelines</h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
              <strong>Manual/Ops Restore Procedure:</strong><br />
              1. To restore from a JSON backup file, use the MongoDB `mongoimport` CLI tool or run the admin seed restore script (`node src/scripts/restore-backup.js`).<br />
              2. For production environments deployed on MongoDB Atlas or managed infrastructure, automated daily snapshot backups are maintained at the cloud provider level.<br />
              3. Always test JSON restores in a staging environment prior to production import.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
