import Seo from '../../components/public/Seo'
import { SectionHeading, DoctorCard, CtaBanner } from '../../components/public/Sections'
import { usePublicSiteData } from '../../hooks/usePublicSiteData'

const TEAM_INTRO = [
  { name: 'Dr. Meera Nair', specialization: 'General Dentistry', bio: 'Founder & lead dentist. Believes every smile deserves gentle, honest care.' },
]

export default function DoctorsPage() {
  const { doctors, loading } = usePublicSiteData()

  const team = doctors.length ? doctors : TEAM_INTRO.map((d) => ({ id: d.name, name: d.name, specialization: d.specialization }))

  return (
    <>
      <Seo
        title="Our Doctors & Team"
        description="Meet the experienced dental specialists behind Sai Dental Clinic — gentle, expert care for the whole family."
      />

      <section className="page-hero">
        <div className="container page-hero-inner">
          <SectionHeading eyebrow="Our team" title="Meet your dental specialists" lead="Qualified, approachable and endlessly gentle — the people who make your dental visit feel easy." />
        </div>
      </section>

      <section className="container pub-section">
        {loading && <p className="muted">Loading our team…</p>}
        <div className="card-grid card-grid-3">
          {team.map((d, i) => (
            <DoctorCard key={d.id || `doctor-${i}`} doctor={d} />
          ))}
        </div>
      </section>

      <section className="pub-alt-section">
        <div className="container">
          <SectionHeading eyebrow="Why it matters" title="The right doctor, the right care" />
          <div className="about-grid reverse">
            <div className="about-text">
              <h2>Specialists under one roof</h2>
              <p>
                From general check-ups to implants, braces and oral surgery, our team covers every
                specialty — so your care is coordinated, consistent and convenient.
              </p>
              <ul className="about-list">
                <li><span className="step-num">✓</span><div><strong>Warm, attentive service</strong><p>You're a person, not a patient number.</p></div></li>
                <li><span className="step-num">✓</span><div><strong>Continued education</strong><p>Our doctors stay current with the latest techniques.</p></div></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CtaBanner title="Find your perfect dentist" lead="Book with the specialist that matches your needs." />
    </>
  )
}