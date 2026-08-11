import { useState } from 'react'
import Icon from '../../components/public/Icon'
import Seo from '../../components/public/Seo'
import { SectionHeading, TreatmentCard, DoctorCard, TestimonialCard, CtaBanner, StatsBar } from '../../components/public/Sections'
import { usePublicSiteData } from '../../hooks/usePublicSiteData'
import { CLINIC, TREATMENTS, TESTIMONIALS, WHY_CHOOSE_US } from '../../data/clinic'

export default function HomePage() {
  const { doctors, services, loading, error } = usePublicSiteData()
  const [activeFaq, setActiveFaq] = useState(0)

  const featuredTreatments = TREATMENTS.slice(0, 6)
  const serviceCount = services.length
  const apiTreatments = services.map((s) => ({
    slug: s.name,
    title: s.name,
    short: s.description || `${s.name} care at Sai Dental Clinic.`,
    description: s.description || `${s.name} performed by our experienced dental team.`,
    icon: 'tooth',
    includes: ['Consultation & examination', 'Digital X-ray as needed', 'Personalised care plan'],
    priceFrom: s.unitPrice || 400,
  }))

  const displayTreatments = serviceCount > 0 ? [...featuredTreatments, ...apiTreatments] : featuredTreatments

  return (
    <>
      <Seo
        title="Dental Clinic in Gurugram — Sai Dental Clinic"
        description="Sai Dental Clinic offers gentle, modern dentistry in Gurugram — root canal, implants, braces, whitening, kid-friendly care & more. Book online."
      />

      {/* Hero */}
      <section className="hero pub-hero">
        <div className="container pub-hero-inner">
          <div className="pub-hero-left">
            <div className="hero-badge-wrap">
              <span className="eyebrow">{CLINIC.name}</span>
              <span className="hero-rating-badge">
                <Icon name="star" size={14} className="star-full" /> 4.9 Rating (1,200+ Patients)
              </span>
            </div>
            <h1 className="hero-display-title">
              Beyond <span className="text-primary">Dentistry.</span>
            </h1>
            <p className="hero-lead">
              From routine check-ups to rotary endodontics, dental implants, and clear aligners — expert, gentle care for every family in Gurugram.
            </p>
            <div className="hero-actions">
              <a href="/book" className="btn btn-primary btn-lg">
                Book appointment <Icon name="arrow" size={18} />
              </a>
              <a href="/treatments" className="btn btn-accent btn-lg">
                Explore treatments
              </a>
            </div>
            <div className="hero-trust">
              <span><Icon name="shield" size={18} /> Hospital-grade sterile & safe</span>
              <span><Icon name="check" size={18} /> Trusted since {CLINIC.founded}</span>
            </div>
          </div>
          <div className="pub-hero-right" aria-hidden="true">
            <div className="hero-illustration">
              <div className="hero-illustration-card">
                <Icon name="tooth" size={110} className="hero-tooth" />
                <div className="hero-floating-pill">
                  <Icon name="sparkles" size={18} /> 100% Pain-free procedures
                </div>
              </div>
              <Icon name="sparkles" size={38} className="hero-spark hero-spark-one" />
              <Icon name="sparkles" size={26} className="hero-spark hero-spark-two" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust / experience */}
      <section className="pub-trust">
        <div className="container">
          <StatsBar />
        </div>
      </section>

      {/* Featured treatments */}
      <section className="container pub-section" id="treatments">
        <SectionHeading
          eyebrow="What we treat"
          title="Care for every smile"
          lead="From everyday cleanings to complete smile makeovers — everything under one roof."
        />
        <div className="card-grid card-grid-3">
          {displayTreatments.slice(0, 6).map((t, i) => (
            <TreatmentCard key={`${t.slug}-${i}`} treatment={t} />
          ))}
        </div>
        <div className="section-cta">
          <a href="/treatments" className="btn btn-outline btn-lg">View all treatments <Icon name="arrow" size={18} /></a>
        </div>
      </section>

      {/* Why choose us */}
      <section className="pub-alt-section">
        <div className="container">
          <SectionHeading eyebrow="Why us" title="Why families choose Sai Dental" />
          <div className="card-grid card-grid-4">
            {WHY_CHOOSE_US.map((w) => (
              <article className="pub-card why-card" key={w.title}>
                <span className="pub-icon-badge" aria-hidden="true"><Icon name={w.icon} size={24} /></span>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors / team */}
      <section className="container pub-section">
        <SectionHeading eyebrow="Our team" title="Meet your dentists" lead="Experienced specialists who treat you like family." />
        {loading ? (
          <p className="muted" role="status" aria-live="polite">Loading our doctors…</p>
        ) : error ? (
          <p className="muted" role="alert">{error}</p>
        ) : (
          <div className="card-grid card-grid-3">
            {(doctors.length ? doctors : [{ name: 'Dr. Meera Nair', specialization: 'General Dentistry' }]).map((d, i) => (
              <DoctorCard key={d.id || `d-${i}`} doctor={d} />
            ))}
          </div>
        )}
        <div className="section-cta">
          <a href="/doctors" className="text-link">Meet the full team <Icon name="arrow" size={16} /></a>
        </div>
      </section>

      {/* Testimonials */}
      <section className="pub-alt-section">
        <div className="container">
          <SectionHeading eyebrow="Patient stories" title="What our patients say" />
          <div className="card-grid card-grid-3">
            {TESTIMONIALS.slice(0, 6).map((t) => (
              <TestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="container pub-section">
        <SectionHeading eyebrow="The clinic" title="Built for your comfort" lead="A modern, spotless environment designed around patient comfort and safety." />
        <div className="facilities-grid">
          {[
            { icon: 'xray', title: 'Digital X-Ray & OPG', text: 'Low-radiation imaging for accurate, fast diagnosis.' },
            { icon: 'sterile', title: 'Hospital-grade sterilisation', text: 'Sealed, autoclaved instruments for every visit.' },
            { icon: 'child', title: 'Kid-friendly care', text: 'A calm, reassuring space for our youngest patients.' },
            { icon: 'clock', title: 'Flexible evening hours', text: 'Appointments available six days a week.' },
          ].map((f) => (
            <div className="facility-pill" key={f.title}>
              <span className="pub-icon-badge" aria-hidden="true"><Icon name={f.icon} size={22} /></span>
              <div><strong>{f.title}</strong><p>{f.text}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pub-alt-section">
        <div className="container faq-block">
          <SectionHeading eyebrow="Good to know" title="Frequently asked questions" />
          <div className="faq-list">
            {[
              { q: 'How do I book an appointment?', a: 'Use the online booking form or call us. We confirm every request personally by phone.' },
              { q: 'Do you accept walk-in patients?', a: 'Yes. Priority goes to scheduled appointments, but we always try to fit walk-ins in.' },
              { q: 'Is root canal treatment painful?', a: 'No — with modern rotary endodontics and effective anaesthesia, most patients feel little to nothing.' },
              { q: 'Do you treat children?', a: 'Absolutely. Our pediatric dentistry team specialises in making kids feel safe and comfortable.' },
            ].map((f, i) => (
              <div className={`faq-item ${activeFaq === i ? 'open' : ''}`} key={f.q}>
                <button type="button" className="faq-question" onClick={() => setActiveFaq(activeFaq === i ? -1 : i)} aria-expanded={activeFaq === i}>
                  <span>{f.q}</span>
                  <Icon name="chevron" size={18} />
                </button>
                {activeFaq === i && <p className="faq-answer">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />
    </>
  )
}