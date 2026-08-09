import Icon from '../../components/public/Icon'
import Seo from '../../components/public/Seo'
import { SectionHeading, CtaBanner, StatsBar } from '../../components/public/Sections'
import { CLINIC, FACILITIES } from '../../data/clinic'

export default function AboutPage() {
  return (
    <>
      <Seo
        title="About Us"
        description={`Learn about ${CLINIC.name} — a modern, patient-first dental clinic in ${CLINIC.addressShort}. ${CLINIC.yearsExperience}+ years of gentle, expert care.`}
      />

      <section className="page-hero">
        <div className="container page-hero-inner">
          <SectionHeading eyebrow={`Since ${CLINIC.founded}`} title="Welcome to Sai Dental Clinic" lead="A modern practice built on one simple belief: dental care should be gentle, honest and accessible." />
        </div>
      </section>

      <section className="container pub-section about-grid">
        <div className="about-text">
          <h2>Our story</h2>
          <p>
            What began as a small two-chair clinic has grown into one of the neighbourhood's most
            trusted dental practices. Today our team of specialist doctors treats more than a
            thousand families a year — from a child's first check-up to complex full-mouth
            rehabilitation.
          </p>
          <p>
            We keep the same values from day one: listen first, treat gently, explain honestly and
            never recommend treatment you don't need. Every plan is transparent, priced upfront and
            built around your comfort.
          </p>
          <h2>Our approach</h2>
          <ul className="about-list">
            <li><Icon name="check" size={18} /><div><strong>Prevention first</strong><p>We help you keep your natural teeth healthy for life.</p></div></li>
            <li><Icon name="check" size={18} /><div><strong>Gentle by design</strong><p>Modern techniques mean most treatments are virtually painless.</p></div></li>
            <li><Icon name="check" size={18} /><div><strong>Honest pricing</strong><p>Clear quotations before any procedure, no surprises.</p></div></li>
          </ul>
        </div>
        <aside className="about-side">
          <div className="about-highlight">
            <StatsBar />
          </div>
        </aside>
      </section>

      <section className="container pub-section">
        <SectionHeading eyebrow="Our promise" title="A clinic you can trust" lead="Hospital-grade safety standards, in a space that actually feels welcoming." />
        <div className="card-grid card-grid-3">
          {FACILITIES.map((f) => (
            <article className="pub-card facility-card" key={f.title}>
              <span className="pub-icon-badge" aria-hidden="true"><Icon name={f.icon} size={24} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaBanner title="Experience the Sai Dental difference" lead="Visit us and feel the difference gentle, honest care makes." />
    </>
  )
}