import Icon from '../../components/public/Icon'
import Seo from '../../components/public/Seo'
import { SectionHeading, CtaBanner, StatsBar } from '../../components/public/Sections'
import { CLINIC, FACILITIES } from '../../data/clinic'

export default function AboutPage() {
  return (
    <>
      <Seo
        title="About Us — Sai Dental Clinic"
        description={`Learn about ${CLINIC.name} — a modern, patient-first dental clinic in ${CLINIC.addressShort}. ${CLINIC.yearsExperience}+ years of gentle, expert care.`}
      />

      {/* Page Hero */}
      <section className="about-hero-section">
        <div className="container about-hero-inner">
          <span className="eyebrow">Since {CLINIC.founded}</span>
          <h1 className="about-hero-title">
            Gentle, Honest & Modern <span className="text-primary">Dentistry.</span>
          </h1>
          <p className="about-hero-lead">
            Built on one simple promise: treat every patient like family with transparent plans, hospital-grade safety, and pain-free precision.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="pub-trust">
        <div className="container">
          <StatsBar />
        </div>
      </section>

      {/* Story & Approach Section */}
      <section className="container pub-section about-content-section">
        <div className="about-main-grid">
          <div className="about-story-col">
            <h2 className="section-title">Our Story</h2>
            <div className="hairline-divider"></div>
            <p className="about-paragraph">
              What began as a small practice has grown into one of Gurugram's most trusted dental centers. Today our team of specialist doctors treats over a thousand families a year — from a toddler's very first visit to advanced full-mouth restorations and clear aligners.
            </p>
            <p className="about-paragraph">
              We uphold the exact principles from day one: listen carefully, treat gently, explain procedures with complete honesty, and never recommend unnecessary interventions.
            </p>

            <h2 className="section-title mt-6">Our Approach</h2>
            <div className="hairline-divider"></div>
            <div className="about-features-grid">
              <div className="about-feature-block">
                <span className="pub-icon-badge" aria-hidden="true">
                  <Icon name="shield" size={24} />
                </span>
                <div>
                  <h3>Prevention First</h3>
                  <p>Preserving your natural, healthy teeth for life is always our first priority.</p>
                </div>
              </div>

              <div className="about-feature-block">
                <span className="pub-icon-badge" aria-hidden="true">
                  <Icon name="check" size={24} />
                </span>
                <div>
                  <h3>Gentle & Pain-Free</h3>
                  <p>Rotary endodontics and local anesthesia make treatments comfortable and stress-free.</p>
                </div>
              </div>

              <div className="about-feature-block">
                <span className="pub-icon-badge" aria-hidden="true">
                  <Icon name="award" size={24} />
                </span>
                <div>
                  <h3>Transparent Pricing</h3>
                  <p>Upfront itemized quotations before any procedure, with zero surprise fees.</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="about-sidebar-col">
            {/* Featured Clay Accent Card */}
            <div className="card card-featured about-featured-card">
              <span className="eyebrow eyebrow-white">Clinic Philosophy</span>
              <h2>"We measure our success by the confidence in your smile."</h2>
              <p>
                Every sterilization protocol, diagnosis tool, and treatment plan at Sai Dental is designed around your comfort and safety.
              </p>
              <div className="hairline-divider hairline-divider-light"></div>
              <div className="about-doctor-sign">
                <strong>Dr. Meera Nair</strong>
                <span>Lead Dentist & Founder</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Facilities & Promise */}
      <section className="pub-alt-section">
        <div className="container">
          <SectionHeading
            eyebrow="Our Facilities"
            title="Hospital-Grade Standards & Care"
            lead="State-of-the-art equipment in a clean, tranquil clinic environment."
          />
          <div className="card-grid card-grid-3">
            {FACILITIES.map((f) => (
              <article className="pub-card facility-card" key={f.title}>
                <span className="pub-icon-badge" aria-hidden="true">
                  <Icon name={f.icon} size={24} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner
        title="Ready to experience gentle dental care?"
        lead="Schedule your consultation today — our team is here to assist you."
      />
    </>
  )
}