import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import useAuth from '../hooks/useAuth'
import { getRoleDefaultPath } from './LoginPage'

export default function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'receptionist',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={getRoleDefaultPath(user.role)} replace />
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    if (!formData.name.trim()) {
      setError('Please enter your full name.')
      return false
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address.')
      return false
    }
    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.')
      return false
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number.')
      return false
    }
    if (!formData.password) {
      setError('Please enter a password.')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Password and confirmation password do not match.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validate()) return

    setSubmitting(true)
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      })
      navigate('/login', {
        replace: true,
        state: { message: 'Account created successfully! Please sign in.' },
      })
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card register-card">
        <Link to="/" className="brand" aria-label="Sai Dental Clinic home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span className="brand-name">
            Sai Dental <span>Clinic</span>
          </span>
        </Link>

        <h1 className="login-title">Create Account</h1>
        <p className="login-sub">Register to access the Sai Dental Clinic portal.</p>

        {error && (
          <div className="alert alert-error mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">Full Name *</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Dr. John Doe / Jane Smith"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Email Address *</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Phone Number *</span>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              required
            />
          </label>

          <div className="form-row grid-2">
            <label className="field">
              <span className="field-label">Password *</span>
              <div className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="field">
              <span className="field-label">Confirm Password *</span>
              <div className="password-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Initial Requested Role</span>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-select"
            >
              <option value="receptionist">Receptionist / General Staff</option>
              <option value="doctor">Doctor</option>
              <option value="pharmacy">Pharmacy Staff</option>
            </select>
            <span className="field-hint">
              Role permissions are governed by backend security controls.
            </span>
          </label>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg mt-2"
            disabled={submitting}
          >
            {submitting ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <div className="login-footer-links">
          <p className="login-register-prompt">
            Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
          </p>
          <p className="login-back">
            <Link to="/" className="inline-flex items-center gap-1"><ArrowLeft size={14} /> Back to website</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
