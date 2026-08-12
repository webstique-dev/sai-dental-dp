import Icon from '../public/Icon'

export function SectionHeading({ eyebrow, title, lead, align = 'center' }) {
  return (
    <div className={`section-head section-head-${align}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="section-title">{title}</h2>
      {lead && <p className="section-lead">{lead}</p>}
    </div>
  )
}

export function Section({ children, container = true, variant = 'default', className = '', as: Tag = 'section', labelStyle, ...rest }) {
  const classes = [variant === 'alt' ? 'pub-alt-section' : 'pub-section', className].filter(Boolean).join(' ').trim()
  return (
    <Tag className={classes} {...rest}>
      {container ? <div className="container">{children}</div> : children}
    </Tag>
  )
}

export function SectionContainer({ children, className = '', labelStyle, ...rest }) {
  return (
    <div className={`container ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}

export function ResponsiveGrid({ cols = 3, className = '', children }) {
  return (
    <div className={`card-grid card-grid-${cols} ${className}`.trim()}>{children}</div>
  )
}

export const SectionHeader = SectionHeading

export const CTASection = CtaBanner

export function TreatmentCard({ treatment }) {
  return (
    <article className="pub-card treat-card">
      <span className="pub-icon-badge" aria-hidden="true">
        <Icon name={treatment.icon} size={26} />
      </span>
      <h3>{treatment.title}</h3>
      <p>{treatment.short}</p>
      <ul className="treat-points">
        {(treatment.includes || []).slice(0, 3).map((point) => (
          <li key={point}>
            <Icon name="check" size={14} />
            {point}
          </li>
        ))}
      </ul>
      <div className="treat-card-foot">
        <span className="price-tag">
          from <b>₹{treatment.priceFrom.toLocaleString('en-IN')}</b>
        </span>
        <a href={`/treatments/${treatment.slug}`} className="text-link">
          Learn more <Icon name="arrow" size={16} />
        </a>
      </div>
    </article>
  )
}

export function DoctorCard({ doctor }) {
  const initials = (doctor.name || 'Dr')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <article className="pub-card doctor-card">
      <div className="doctor-avatar" aria-hidden="true">
        {initials}
      </div>
      <h3>{doctor.name}</h3>
      <p className="doctor-spec">{doctor.specialization || 'General Dentistry'}</p>
      <a href={`/book?doctor=${doctor.id}`} className="btn btn-outline btn-sm">
        Book with doctor
      </a>
    </article>
  )
}

export function TestimonialCard({ testimonial }) {
  return (
    <figure className="pub-card review-card">
      <div className="review-stars" aria-label={`${testimonial.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} name="star" size={16} {...(i < testimonial.rating ? { className: 'star-full' } : { className: 'star-muted' })} />
        ))}
      </div>
      <blockquote>“{testimonial.text}”</blockquote>
      <figcaption>
        <strong>{testimonial.name}</strong>
        <span>{testimonial.treatment}</span>
      </figcaption>
    </figure>
  )
}

export function CtaBanner({ title = 'Ready to smile with confidence?', lead = 'Book a consultation today — our friendly team will take care of the rest.' }) {
  return (
    <section className="cta-banner">
      <div className="cta-banner-inner">
        <div>
          <h2>{title}</h2>
          <p>{lead}</p>
        </div>
        <div className="cta-actions">
          <a href="/book" className="btn btn-white btn-lg">
            Book appointment
          </a>
          <a href="/contact" className="btn btn-white-outline btn-lg">
            Contact us
          </a>
        </div>
      </div>
    </section>
  )
}

export function StatsBar() {
  return (
    <dl className="stats-bar">
      <div className="stat-item">
        <dt>Years of experience</dt>
        <dd>12+</dd>
      </div>
      <div className="stat-item">
        <dt>Smiles cared for</dt>
        <dd>12,000+</dd>
      </div>
      <div className="stat-item">
        <dt>Expert doctors</dt>
        <dd>4</dd>
      </div>
      <div className="stat-item">
        <dt>Treatment areas</dt>
        <dd>12+</dd>
      </div>
    </dl>
  )
}