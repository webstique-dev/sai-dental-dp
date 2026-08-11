import useAuth from '../../hooks/useAuth'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      <div className="portal-heading">
        <h1>Welcome back, {user.name}</h1>
        <p>
          You are signed in as <strong>{user.roleLabel}</strong>. The clinical
          modules are being built in upcoming phases.
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Role</span>
          <span className="stat-value">{user.roleLabel}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Email</span>
          <span className="stat-value stat-value-sm">{user.email}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Status</span>
          <span className="stat-value stat-value-ok">
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Foundation is live</h2>
        <p className="card-body-text">
          Authentication, role-based access control and the portal shell are
          ready. Patient management, appointments and clinical workflows will
          be added next. Use the navigation menu to preview upcoming modules.
        </p>
      </div>
    </div>
  )
}