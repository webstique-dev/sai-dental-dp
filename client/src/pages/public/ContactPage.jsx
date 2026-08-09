import Icon from '../../components/public/Icon'
import Seo from '../../components/public/Seo'
import { SectionHeading, CtaBanner } from '../../components/public/Sections'
import { CLINIC } from '../../data/clinic'

export default function ContactPage() {
  return (
    <>
      <Seo
        title="Contact Us"
        description={`Contact ${CLINIC.name} at ${CLINIC.address}. Call ${CLINIC.phone} or WhatsApp us — we're open ${CLINIC.hours[0] && CLINIC.hours[0].time}.`}
      />

      <section className="page-hero">
        <div className="container page-hero-inner">
          <SectionHeading eyebrow="Get in touch" title="Contact us" lead="Questions, emergencies or just want to say hi? We're here to help." />
        </div>
      </section>

      <section className="container pub-section contact-grid">
        <div className="contact-info">
          <div className="contact-card">
            <span className="pub-icon-badge" aria-hidden="true"><Icon name="pin" size={24} /></span>
            <h3>Visit us</h3>
            <p>{CLINIC.address}</p>
            <a href="tel:+919876543210" className="btn btn-sm btn-outline">Get directions</a>
          </div>
          <div className="contact-card">
            <span className="pub-icon-badge" aria-hidden="true"><Icon name="phone" size={24} /></span>
            <h3>Call us</h3>
            <p><a href={CLINIC.phoneHref}>{CLINIC.phone}</a></p>
            <a href="tel:+919876543210" className="btn btn-sm btn-primary">Call now</a>
          </div>
          <div className="contact-card">
            <span className="pub-icon-badge" aria-hidden="true"><Icon name="mail" size={24} /></span>
            <h3>Email us</h3>
            <p><a href={CLINIC.emailHref}>{CLINIC.email}</a></p>
            <a href={CLINIC.emailHref} className="btn btn-sm btn-outline">Send email</a>
          </div>
          <div className="contact-card">
            <span className="pub-icon-badge" aria-hidden="true"><Icon name="whatsapp" size={24} /></span>
            <h3>WhatsApp</h3>
            <p>Quick answers for appointments &amp; queries.</p>
            <a href={CLINIC.whatsapp} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">Chat on WhatsApp</a>
          </div>
        </div>

        <div className="contact-map">
          <div className="map-frame">
            <iframe
              title={`${CLINIC.name} location map`}
              src={CLINIC.mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="hours-card">
            <h3><Icon name="clock" size={20} /> Opening hours</h3>
            <ul className="footer-hours">
              {CLINIC.hours.map((h) => (
                <li key={h.days}>
                  <Icon name="clock" size={16} />
                  <span><strong>{h.days}</strong><br />{h.time}</span>
                </li>
              ))}
            </ul>
            <p className="muted">Emergencies: call ahead, we reserve daily slots for urgent care.</p>
          </div>
        </div>
      </section>

      <CtaBanner title="Prefer to book online?" lead="Skip the phone queue — request your appointment in under a minute." />
    </>
  )
}