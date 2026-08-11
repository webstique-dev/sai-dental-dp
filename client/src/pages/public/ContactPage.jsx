import Icon from '../../components/public/Icon'
import Seo from '../../components/public/Seo'
import { SectionHeading, CtaBanner } from '../../components/public/Sections'
import { CLINIC } from '../../data/clinic'

export default function ContactPage() {
  return (
    <>
      <Seo
        title="Contact Us — Sai Dental Clinic"
        description={`Contact ${CLINIC.name} at ${CLINIC.address}. Call ${CLINIC.phone} or WhatsApp us — we're open ${CLINIC.hours[0] && CLINIC.hours[0].time}.`}
      />

      {/* Page Hero */}
      <section className="contact-hero-section">
        <div className="container contact-hero-inner">
          <span className="eyebrow">Get In Touch</span>
          <h1 className="contact-hero-title">
            We're Here For Your <span className="text-primary">Smile.</span>
          </h1>
          <p className="contact-hero-lead">
            Questions, appointments, or emergency dental care? Contact our team directly via phone, WhatsApp, or visit our Gurugram clinic.
          </p>
        </div>
      </section>

      {/* Contact Grid Section */}
      <section className="container pub-section">
        <div className="contact-main-grid">
          {/* Info Cards Grid */}
          <div className="contact-info-grid">
            <div className="card pub-card contact-card">
              <span className="pub-icon-badge" aria-hidden="true">
                <Icon name="pin" size={24} />
              </span>
              <h3>Visit Our Clinic</h3>
              <p className="contact-card-text">{CLINIC.address}</p>
              <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                Get Directions <Icon name="arrow" size={14} />
              </a>
            </div>

            <div className="card pub-card contact-card">
              <span className="pub-icon-badge" aria-hidden="true">
                <Icon name="phone" size={24} />
              </span>
              <h3>Call Us Directly</h3>
              <p className="contact-card-text">
                <a href={CLINIC.phoneHref} className="contact-link">{CLINIC.phone}</a>
              </p>
              <a href={CLINIC.phoneHref} className="btn btn-sm btn-primary">
                Call Now <Icon name="phone" size={14} />
              </a>
            </div>

            <div className="card pub-card contact-card">
              <span className="pub-icon-badge" aria-hidden="true">
                <Icon name="mail" size={24} />
              </span>
              <h3>Email Us</h3>
              <p className="contact-card-text">
                <a href={CLINIC.emailHref} className="contact-link">{CLINIC.email}</a>
              </p>
              <a href={CLINIC.emailHref} className="btn btn-sm btn-outline">
                Send Email <Icon name="mail" size={14} />
              </a>
            </div>

            <div className="card pub-card contact-card">
              <span className="pub-icon-badge" aria-hidden="true">
                <Icon name="whatsapp" size={24} />
              </span>
              <h3>WhatsApp Chat</h3>
              <p className="contact-card-text">Instant responses for booking & queries.</p>
              <a href={CLINIC.whatsapp} target="_blank" rel="noreferrer" className="btn btn-sm btn-accent">
                Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Map & Hours Column */}
          <div className="contact-map-col">
            <div className="map-frame-wrapper">
              <iframe
                title={`${CLINIC.name} location map`}
                src={CLINIC.mapEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="map-iframe"
              />
            </div>

            <div className="card hours-card mt-4">
              <div className="hours-card-head">
                <Icon name="clock" size={22} className="text-primary" />
                <h3>Clinic Opening Hours</h3>
              </div>
              <ul className="hours-list">
                {CLINIC.hours.map((h) => (
                  <li key={h.days} className="hours-item">
                    <span className="hours-days">{h.days}</span>
                    <span className="hours-time">{h.time}</span>
                  </li>
                ))}
              </ul>
              <div className="emergency-notice mt-4">
                <Icon name="shield" size={16} /> <strong>Emergency Care:</strong> Reserved daily slots available. Call ahead for immediate assistance.
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBanner
        title="Prefer to book your visit online?"
        lead="Request your appointment in under a minute with instant mobile confirmation."
      />
    </>
  )
}