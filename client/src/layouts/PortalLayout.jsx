import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut } from 'lucide-react'
import { navForRole } from '../config/nav'
import useAuth from '../hooks/useAuth'
import ConfirmationDialog from '../components/common/ConfirmationDialog'

export default function PortalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  if (!user) return null

  const nav = navForRole(user.role)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login')
    } finally {
      setLoggingOut(false)
    }
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
            <X size={18} />
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
            <Menu size={20} />
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
                onClick={() => setShowLogoutConfirm(true)}
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

      <ConfirmationDialog
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your Sai Dental Clinic account?"
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="danger"
        loading={loggingOut}
        loadingText="Signing out…"
        icon={LogOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}