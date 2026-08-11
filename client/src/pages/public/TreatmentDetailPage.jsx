import { Navigate, useParams } from 'react-router-dom'
import Icon from '../../components/public/Icon'
import Seo from '../../components/public/Seo'
import { Section, SectionHeading, CtaBanner } from '../../components/public/Sections'
import { TREATMENTS, TREATMENT_BY_SLUG } from '../../data/clinic'

export default function TreatmentDetailPage() {
  const { slug } = useParams()
  const treatment = TREATMENT_BY_SLUG[slug]

  if (!treatment) {
    return <Navigate to="/treatments" replace />
  }

  const next = TREATMENTS[(TREATMENTS.findIndex((t) => t.slug === slug) + 1) % TREATMENTS.length]

  return (
    <>
      <Seo
        title={treatment.title}
        description={`${treatment.title} at Sai Dental Clinic ${CLINIC_TAG}. ${treatment.short}`}
      />

      <section className="page-hero">
        <div className="container page-hero-inner detail-hero">
          <span className="pub-icon-badge pub-icon-badge-lg" aria-hidden="true">
            <Icon name={treatment.icon} size={34} />
          </span>
          <SectionHeading eyebrow="Treatment" title={treatment.title} lead={treatment.short} />
          <div className="detail-meta">
            <span className="price-tag">from <b>₹{treatment.priceFrom.toLocaleString('en-IN')}</b></span>
            <a href={`/book?service=${treatment.slug}`} className="btn btn-primary">Book {treatment.title}</a>
          </div>
        </div>
      </section>

      <Section className="detail-layout">
        <article className="detail-main">
          <h2>About this treatment</h2>
          <p>{treatment.description}</p>

          <h3>What's included</h3>
          <ul className="treat-points detail-list">
            {treatment.includes.map((point) => (
              <li key={point}>
                <Icon name="check" size={16} />
                {point}
              </li>
            ))}
          </ul>

          <h3>What to expect</h3>
          <ol className="steps-list">
            <li><span className="step-num">1</span><div><strong>Consultation & diagnosis</strong><p>We assess your condition and take X-rays if needed.</p></div></li>
            <li><span className="step-num">2</span><div><strong>Treatment plan & quote</strong><p>You receive a clear, upfront plan and cost — no surprises.</p></div></li>
            <li><span className="step-num">3</span><div><strong>Treatment & aftercare</strong><p>We perform the treatment gently and guide your recovery.</p></div></li>
          </ol>
        </article>

        <aside className="detail-side">
          <div className="side-card">
            <h3>Good to know</h3>
            <ul className="side-list">
              <li><Icon name="clock" size={16} /> Typically 1 visit, sometimes more</li>
              <li><Icon name="shield" size={16} /> Fully sterile, modern facility</li>
              <li><Icon name="wallet" size={16} /> EMI & payment plans available</li>
            </ul>
          </div>
          <div className="side-card emergency-note">
            <Icon name="phone" size={18} />
            <div><strong>Have a question?</strong><p>Call us — we're happy to help.</p><a href="tel:+919876543210" className="text-link">+91 98765 43210</a></div>
          </div>
          <a href={`/book?service=${treatment.slug}`} className="btn btn-primary btn-block btn-lg">Book this treatment</a>
        </aside>
      </Section>

      <Section>
        <SectionHeading eyebrow="Also popular" title="Explore more treatments" lead="From the same team you already trust." />
        <div className="detail-next">
          <a href={`/treatments/${next.slug}`} className="pub-card treat-card">
            <span className="pub-icon-badge" aria-hidden="true"><Icon name={next.icon} size={24} /></span>
            <h3>{next.title}</h3>
            <p>{next.short}</p>
            <span className="text-link">Learn more <Icon name="arrow" size={16} /></span>
          </a>
        </div>
      </Section>

      <CtaBanner title={`Looking for ${treatment.title.toLowerCase()}?`} lead="Book a consultation and we'll take care of everything else." />
    </>
  )
}

const CLINIC_TAG = 'your trusted dental clinic in Gurugram'