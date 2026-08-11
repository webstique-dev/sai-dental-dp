import { useState, useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

export function getRoleDefaultPath(role) {
  switch (role) {
    case 'doctor':
      return '/portal/consultations'
    case 'pharmacy':
      return '/portal/pharmacy'
    case 'receptionist':
    case 'admin':
    default:
      return '/portal'
  }
}

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState(location.state?.message || '')
  const [submitting, setSubmitting] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('sai_remembered_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  if (user) {
    const dest = from || getRoleDefaultPath(user.role)
    return <Navigate to={dest} replace />
  }

  const validateForm = () => {
    if (!email.trim()) {
      setError('Please enter your email address.')
      return false
    }
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.')
      return false
    }
    if (!password) {
      setError('Please enter your password.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!validateForm()) return

    setSubmitting(true)
    try {
      if (rememberMe) {
        localStorage.setItem('sai_remembered_email', email.trim())
      } else {
        localStorage.removeItem('sai_remembered_email')
      }

      const loggedUser = await login(email, password)
      const targetPath = from || getRoleDefaultPath(loggedUser.role)
      navigate(targetPath, { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid credentials or unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <Link to="/" className="brand" aria-label="Sai Dental Clinic home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span className="brand-name">
            Sai Dental <span>Clinic</span>
          </span>
        </Link>

        <h1 className="login-title">Clinic Portal</h1>
        <p className="login-sub">Sign in to access your dashboard & records.</p>

        {successMsg && (
          <div className="alert alert-success mb-4" role="status">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">Email Address</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@saidental.local"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="login-options-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="forgot-link-btn"
              onClick={() => setShowForgotModal(true)}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-footer-links">
          <p className="login-register-prompt">
            Don't have an account? <Link to="/register" className="auth-link">Create Account</Link>
          </p>
          <p className="login-back">
            <Link to="/">← Back to website</Link>
          </p>
        </div>
      </div>

      {showForgotModal && (
        <div className="modal-backdrop" onClick={() => setShowForgotModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Password Reset Support</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowForgotModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                For security reasons, password resets are handled directly by the Sai Dental Clinic administration team.
              </p>
              <p className="mt-2">
                Please contact the front desk or email <strong>admin@saidental.local</strong> to verify your identity and request a password reset.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowForgotModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}