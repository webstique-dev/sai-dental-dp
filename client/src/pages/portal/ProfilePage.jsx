import { useState } from 'react'
import useAuth from '../../hooks/useAuth'

export default function ProfilePage() {
  const { user, changePassword, logout } = useAuth()

  const [pwData, setPwData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user) return null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setPwData((prev) => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  const validatePasswordForm = () => {
    if (!pwData.currentPassword) {
      setError('Please enter your current password.')
      return false
    }
    if (!pwData.newPassword) {
      setError('Please enter a new password.')
      return false
    }
    if (pwData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return false
    }
    if (pwData.newPassword === pwData.currentPassword) {
      setError('New password cannot be the same as your current password.')
      return false
    }
    if (pwData.newPassword !== pwData.confirmNewPassword) {
      setError('New password and confirm password do not match.')
      return false
    }
    return true
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validatePasswordForm()) return

    setSubmitting(true)
    try {
      await changePassword({
        currentPassword: pwData.currentPassword,
        newPassword: pwData.newPassword,
      })
      setSuccess('Your password has been successfully updated!')
      setPwData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      })
    } catch (err) {
      setError(err.message || 'Failed to change password. Please check your current password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="profile-page">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">User Profile & Account</h1>
          <p className="page-sub">Manage your clinic profile details and security credentials.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Profile Information Card */}
        <div className="card profile-card">
          <div className="card-header">
            <h2 className="card-title">Profile Information</h2>
          </div>
          <div className="card-body">
            <div className="user-profile-header">
              <div className="user-avatar-large">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-profile-meta">
                <h3 className="user-profile-name">{user.name}</h3>
                <span className="badge badge-primary">{user.roleLabel || user.role}</span>
              </div>
            </div>

            <div className="profile-details-list">
              <div className="profile-detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{user.email}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">Phone Number</span>
                <span className="detail-value">{user.phone || 'Not provided'}</span>
              </div>

              <div className="profile-detail-item">
                <span className="detail-label">Role</span>
                <span className="detail-value capitalize">{user.roleLabel || user.role}</span>
              </div>

              {user.specialization && (
                <div className="profile-detail-item">
                  <span className="detail-label">Specialization</span>
                  <span className="detail-value">{user.specialization}</span>
                </div>
              )}

              <div className="profile-detail-item">
                <span className="detail-label">Account Status</span>
                <span className="detail-value">
                  <span className="status-dot active"></span> Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card profile-card">
          <div className="card-header">
            <h2 className="card-title">Change Password</h2>
          </div>
          <div className="card-body">
            {success && (
              <div className="alert alert-success mb-4" role="status">
                {success}
              </div>
            )}

            {error && (
              <div className="alert alert-error mb-4" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} noValidate>
              <label className="field">
                <span className="field-label">Current Password *</span>
                <div className="password-input-wrap">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    name="currentPassword"
                    value={pwData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showCurrent ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label className="field">
                <span className="field-label">New Password *</span>
                <div className="password-input-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    name="newPassword"
                    value={pwData.newPassword}
                    onChange={handleInputChange}
                    placeholder="At least 6 characters"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowNew(!showNew)}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label className="field">
                <span className="field-label">Confirm New Password *</span>
                <div className="password-input-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmNewPassword"
                    value={pwData.confirmNewPassword}
                    onChange={handleInputChange}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <div className="form-actions mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Updating Password…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
