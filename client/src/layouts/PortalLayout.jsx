import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { navForRole } from '../config/nav'
import useAuth from '../hooks/useAuth'

export default function PortalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!user) return null

  const nav = navForRole(user.role)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="portal">
      <div
        className={`portal-backdrop ${drawerOpen ? 'is-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <aside className={`portal-sidebar ${drawerOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            <span className="brand-name">
              Sai Dental <span>Clinic</span>
            </span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={closeDrawer}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Portal">
          {nav.map((group) => (
            <div className="nav-group" key={group.section}>
              <div className="nav-section-label">{group.section}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={closeDrawer}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' is-active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="portal-user">
            <NavLink
              to="/portal/profile"
              className="portal-user-link"
              title="View & edit profile"
            >
              <span className="avatar" aria-hidden="true">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
              <div className="portal-user-meta">
                <span className="portal-user-name">{user.name}</span>
                <span className="portal-user-role">{user.roleLabel || user.role}</span>
              </div>
            </NavLink>
            <div className="portal-user-actions">
              <NavLink to="/portal/profile" className="btn btn-ghost btn-sm">
                Profile
              </NavLink>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLogout}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}