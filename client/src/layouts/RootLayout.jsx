import { Link, Outlet } from 'react-router-dom'

export default function RootLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="Sai Dental Clinic home">
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            <span className="brand-name">
              Sai Dental <span>Clinic</span>
            </span>
          </Link>
          <nav className="site-nav" aria-label="Primary">
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/doctors">Doctors</Link>
            <Link to="/appointments">Appointments</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <Link to="/login" className="btn btn-primary btn-sm site-login">
            Staff login
          </Link>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            &copy; {new Date().getFullYear()} Sai Dental Clinic. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
