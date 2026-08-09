import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Icon from '../components/public/Icon'
import { CLINIC } from '../data/clinic'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/treatments', label: 'Treatments' },
  { to: '/doctors', label: 'Our Team' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/contact', label: 'Contact' },
]

export default function RootLayout() {
  const [open, setOpen] = useState(false)

  // Lock body scroll while the mobile menu is open and close on Escape.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const close = () => setOpen(false)

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="Sai Dental Clinic home" onClick={close}>
            <span className="brand-mark" aria-hidden="true">
              <Icon name="tooth" size={22} strokeWidth={1.5} />
            </span>
            <span className="brand-name">
              Sai Dental <span>Clinic</span>
            </span>
          </Link>

          <nav className="site-nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => (isActive ? 'site-nav-link active' : 'site-nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <Link to="/book" className="btn btn-primary btn-sm">Book appointment</Link>
            <Link to="/login" className="btn btn-outline btn-sm site-login">Staff login</Link>
            <button
              type="button"
              className="menu-toggle-btn"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <Icon name={open ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>

        <div className={`mobile-nav ${open ? 'is-open' : ''}`}>
          <nav className="mobile-nav-links" aria-label="Mobile">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={close}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/book" className="btn btn-primary btn-block" onClick={close}>
            Book appointment
          </Link>
          <Link to="/login" className="btn btn-outline btn-block" onClick={close}>
            Staff login
          </Link>
        </div>

        {open && (
          <button
            type="button"
            className="mobile-nav-backdrop"
            onClick={close}
            aria-label="Close menu"
            tabIndex={-1}
          />
        )}
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer footer-lg">
        <div className="container footer-grid">
          <div>
            <Link to="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                <Icon name="tooth" size={22} strokeWidth={1.5} />
              </span>
              <span className="brand-name">
                Sai Dental <span>Clinic</span>
              </span>
            </Link>
            <p className="footer-blurb">{CLINIC.tagline}.</p>
            <div className="footer-contact">
              <a href={CLINIC.phoneHref}>
                <Icon name="phone" size={16} /> {CLINIC.phone}
              </a>
              <a href={CLINIC.emailHref}>
                <Icon name="mail" size={16} /> {CLINIC.email}
              </a>
            </div>
          </div>

          <div>
            <h3 className="footer-title">Explore</h3>
            <ul className="footer-links">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="footer-title">Treatments</h3>
            <ul className="footer-links">
              <li><Link to="/treatments">All treatments</Link></li>
              <li><Link to="/treatments/root-canal-treatment">Root Canal</Link></li>
              <li><Link to="/treatments/dental-implants">Dental Implants</Link></li>
              <li><Link to="/treatments/orthodontics">Braces & Aligners</Link></li>
              <li><Link to="/treatments/teeth-whitening">Whitening</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="footer-title">Visit us</h3>
            <p className="footer-address">
              <Icon name="pin" size={16} /> {CLINIC.address}
            </p>
            <ul className="footer-hours">
              {CLINIC.hours.map((h) => (
                <li key={h.days}>
                  <Icon name="clock" size={16} />
                  <span>
                    {h.days}
                    <br />
                    {h.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="container footer-bottom">
          <p>&copy; {new Date().getFullYear()} Sai Dental Clinic. All rights reserved.</p>
          <p>
            <Link to="/login">Staff login</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}