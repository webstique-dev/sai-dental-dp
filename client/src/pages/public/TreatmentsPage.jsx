import Icon from '../../components/public/Icon'
import Seo from '../../components/public/Seo'
import { SectionHeading, TreatmentCard, CtaBanner } from '../../components/public/Sections'
import { usePublicSiteData } from '../../hooks/usePublicSiteData'
import { TREATMENTS } from '../../data/clinic'

export default function TreatmentsPage() {
  const { services, loading } = usePublicSiteData()
  const apiTreatments = services.map((s) => ({
    slug: s.name,
    title: s.name,
    short: s.description || `${s.name} care at Sai Dental Clinic.`,
    description: s.description || `${s.name} performed by our experienced dental team.`,
    icon: 'tooth',
    includes: ['Consultation & examination', 'Digital X-ray as needed', 'Personalised care plan'],
    priceFrom: s.unitPrice || 400,
  }))

  return (
    <>
      <Seo
        title="Treatments & Services"
        description="Explore dental treatments at Sai Dental Clinic — general & cosmetic dentistry, root canals, implants, braces, whitening, and kid-friendly care."
      />

      <section className="page-hero">
        <div className="container page-hero-inner">
          <SectionHeading eyebrow="Our services" title="Treatments we offer" lead="Comprehensive dentistry for the whole family — explore what we do below, then book the right treatment for you." />
        </div>
      </section>

      <section className="container pub-section">
        <div className="card-grid card-grid-3">
          {TREATMENTS.map((t) => (
            <TreatmentCard key={t.slug} treatment={t} />
          ))}
        </div>
      </section>

      {(loading || apiTreatments.length > 0) && (
        <section className="pub-alt-section scoring-treatments">
          <div className="container">
            <SectionHeading eyebrow="Complete price list" title="Full service catalogue" lead="Current clinic price list — always confirmed before treatment." />
            <div className="price-table">
              {loading ? (
                <p className="muted">Loading price list…</p>
              ) : apiTreatments.length === 0 ? (
                <p className="muted">No additional services found.</p>
              ) : (
                apiTreatments.map((s) => (
                  <a href={`/treatments/${encodeURIComponent(s.slug)}`} className="price-row" key={s.slug}>
                    <span className="price-name">{s.title}</span>
                    <span className="price-value">from ₹{s.priceFrom.toLocaleString('en-IN')}</span>
                    <Icon name="arrow" size={16} />
                  </a>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <CtaBanner title="Not sure what you need?" lead="Book a consultation — we'll examine your teeth and recommend only what's necessary." />
    </>
  )
}