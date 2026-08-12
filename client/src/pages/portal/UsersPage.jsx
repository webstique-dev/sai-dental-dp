import { useState, useEffect } from 'react'
import { Plus, UserCheck, UserX, Key, Shield, Search, Edit } from 'lucide-react'
import {
  listUsers,
  createUser,
  updateUser,
  toggleUserActive,
  resetUserPassword,
} from '../../services/userService'
import { TextField } from '../../components/ui/fields'
import ConfirmationDialog from '../../components/common/ConfirmationDialog'
import { SkeletonTable } from '../../components/common/skeleton'
import { Modal } from '../../components/common/modal'
import { useNotification } from '../../components/common/notification'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'pharmacy', label: 'Pharmacy' },
]

export default function UsersPage() {
  const notify = useNotification()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [roleFilter, setRoleFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'receptionist',
    specialization: '',
  })

  // Edit User Modal state
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: 'receptionist',
    specialization: '',
  })

  // Reset Password Modal state
  const [resetUser, setResetUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  // Toggle Active confirm state
  const [confirmToggleUser, setConfirmToggleUser] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listUsers({ role: roleFilter, q: searchQuery, includeInactive: 'true' })
      setUsers(res.users || [])
    } catch (err) {
      const errMsg = err.message || 'Failed to load staff users'
      setError(errMsg)
      notify.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, searchQuery])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!createForm.name || !createForm.email || !createForm.password) {
      const msg = 'Please fill in all required fields (Name, Email, Password).'
      setError(msg)
      notify.warning(msg)
      return
    }
    setError('')
    setNotice('')
    try {
      await createUser(createForm)
      notify.success(`Staff user account created for ${createForm.name}.`)
      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', phone: '', password: '', role: 'receptionist', specialization: '' })
      fetchUsers()
    } catch (err) {
      const errMsg = err.message || 'Failed to create staff user.'
      setError(errMsg)
      notify.error(errMsg)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    setError('')
    setNotice('')
    try {
      await updateUser(editingUser.id, editForm)
      notify.success(`Updated staff account details for ${editingUser.name}.`)
      setEditingUser(null)
      fetchUsers()
    } catch (err) {
      const errMsg = err.message || 'Failed to update staff user.'
      setError(errMsg)
      notify.error(errMsg)
    }
  }

  const handleToggleActive = async () => {
    if (!confirmToggleUser) return
    setError('')
    setNotice('')
    try {
      const res = await toggleUserActive(confirmToggleUser.id)
      notify.success(res.message || 'User active status updated.')
      setConfirmToggleUser(null)
      fetchUsers()
    } catch (err) {
      const errMsg = err.message || 'Failed to toggle account status.'
      setError(errMsg)
      notify.error(errMsg)
      setConfirmToggleUser(null)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!resetUser || !newPassword) return
    setError('')
    setNotice('')
    try {
      await resetUserPassword(resetUser.id, newPassword)
      notify.success(`Password reset successfully for ${resetUser.name}.`)
      setResetUser(null)
      setNewPassword('')
    } catch (err) {
      const errMsg = err.message || 'Failed to reset password.'
      setError(errMsg)
      notify.error(errMsg)
    }
  }

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Staff Accounts & Role Management</h1>
          <p>Create staff accounts, assign roles, manage access control, and trigger password resets</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-1 inline" /> Create Staff Account
        </button>
      </div>

      {notice && <div className="form-success mb-4">{notice}</div>}
      {error && <div className="form-error mb-4" role="alert">{error}</div>}

      {/* Filter Bar */}
      <div className="card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search staff by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: '180px' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
        {loading && users.length === 0 ? (
          <SkeletonTable rows={5} columns={6} />
        ) : users.length === 0 ? (
          <p className="text-muted">No staff accounts found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Staff Name</th>
                  <th style={{ padding: '12px' }}>Email & Phone</th>
                  <th style={{ padding: '12px' }}>Role</th>
                  <th style={{ padding: '12px' }}>Specialization</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: u.isActive ? 1 : 0.6 }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: '12px' }}>
                      <div>{u.email}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{u.phone || '—'}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'doctor' ? 'badge-info' : 'badge-subtle'}`}>
                        {u.roleLabel || u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{u.specialization || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Edit Staff Account"
                          onClick={() => {
                            setEditingUser(u)
                            setEditForm({ name: u.name, phone: u.phone || '', role: u.role, specialization: u.specialization || '' })
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Reset Password"
                          onClick={() => setResetUser(u)}
                        >
                          <Key size={14} />
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${u.isActive ? 'btn-ghost text-danger' : 'btn-ghost text-success'}`}
                          title={u.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                          onClick={() => setConfirmToggleUser(u)}
                        >
                          {u.isActive ? <UserX size={14} color="#dc2626" /> : <UserCheck size={14} color="#16a34a" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Staff Account"
        maxWidth="500px"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <TextField label="Full Name *" value={createForm.name} onChange={(v) => setCreateForm((f) => ({ ...f, name: v }))} placeholder="e.g. Dr. Priya Sharma" />
          <TextField label="Email Address *" value={createForm.email} onChange={(v) => setCreateForm((f) => ({ ...f, email: v }))} placeholder="doctor@saidental.com" />
          <TextField label="Phone Number" value={createForm.phone} onChange={(v) => setCreateForm((f) => ({ ...f, phone: v }))} placeholder="+91 98400 00000" />
          <TextField label="Initial Password *" type="password" value={createForm.password} onChange={(v) => setCreateForm((f) => ({ ...f, password: v }))} placeholder="At least 6 characters" />
          
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Staff Role *</label>
            <select
              className="form-control"
              style={{ width: '100%', marginTop: '4px' }}
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {createForm.role === 'doctor' && (
            <TextField label="Specialization (for Doctors)" value={createForm.specialization} onChange={(v) => setCreateForm((f) => ({ ...f, specialization: v }))} placeholder="e.g. Endodontist / Orthodontist" />
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Account</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `Edit Staff Account: ${editingUser.name}` : ''}
        maxWidth="500px"
      >
        {editingUser && (
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <TextField label="Full Name *" value={editForm.name} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
            <TextField label="Phone Number" value={editForm.phone} onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))} />
            
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Staff Role *</label>
              <select
                className="form-control"
                style={{ width: '100%', marginTop: '4px' }}
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {editForm.role === 'doctor' && (
              <TextField label="Specialization" value={editForm.specialization} onChange={(v) => setEditForm((f) => ({ ...f, specialization: v }))} />
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={Boolean(resetUser)}
        onClose={() => setResetUser(null)}
        title={resetUser ? `Reset Password: ${resetUser.name}` : ''}
        maxWidth="400px"
      >
        {resetUser && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <TextField label="New Password *" type="password" value={newPassword} onChange={setNewPassword} placeholder="At least 6 characters" />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setResetUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Reset Password</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Toggle Active Confirmation Dialog */}
      {confirmToggleUser && (
        <ConfirmationDialog
          open={!!confirmToggleUser}
          title={confirmToggleUser.isActive ? 'Deactivate Staff Account?' : 'Reactivate Staff Account?'}
          message={`Are you sure you want to ${confirmToggleUser.isActive ? 'deactivate' : 'reactivate'} the account for ${confirmToggleUser.name}? ${confirmToggleUser.isActive ? 'They will no longer be able to log into the clinic portal.' : ''}`}
          onConfirm={handleToggleActive}
          onCancel={() => setConfirmToggleUser(null)}
        />
      )}
    </div>
  )
}
