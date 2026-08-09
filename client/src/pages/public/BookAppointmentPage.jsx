import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../../components/public/Icon'
import Seo from '../../components/public/Seo'
import { SectionHeading } from '../../components/public/Sections'
import { usePublicSiteData } from '../../hooks/usePublicSiteData'
import { publicService } from '../../services/publicService'
import { TREATMENTS } from '../../data/clinic'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00',
]

function todayString() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  preferredDate: '',
  preferredTime: '',
  treatment: '',
  preferredDoctorId: '',
  message: '',
}

function validate(values) {
  const errors = {}
  if (!values.name.trim() || values.name.trim().length < 3) errors.name = 'Please enter your full name.'
  const phone = values.phone.trim().replace(/[^+\d]/g, '')
  if (!/^\+?\d{10,15}$/.test(phone)) errors.phone = 'Enter a valid 10-digit phone number.'
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!values.preferredDate) errors.preferredDate = 'Choose a preferred date.'
  else if (values.preferredDate < todayString()) errors.preferredDate = 'Date cannot be in the past.'
  if (!values.preferredTime) errors.preferredTime = 'Choose a preferred time.'
  if (!values.treatment) errors.treatment = 'Please choose a treatment.'
  return errors
}

export default function BookAppointmentPage() {
  const [searchParams] = useSearchParams()
  const { services, doctors, loading } = usePublicSiteData()
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    treatment: searchParams.get('service') || '',
    preferredDoctorId: searchParams.get('doctor') || '',
  }))
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(null)

  const treatmentOptions = useMemo(() => {
    const catalog = TREATMENTS.map((t) => ({ value: t.slug, label: t.title }))
    const api = (services || []).map((s) => ({ value: s.name, label: s.name }))
    const seen = new Set()
    return [...catalog, ...api].filter((o) => {
      if (seen.has(o.value)) return false
      seen.add(o.value)
      return true
    })
  }, [services])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    setServerError('')
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const res = await publicService.requestAppointment({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        preferredDate: form.preferredDate,
        preferredTime: form.preferredTime,
        treatment: form.treatment,
        preferredDoctorId: form.preferredDoctorId || undefined,
        message: form.message.trim() || undefined,
      })
      setSuccess(res.booking)
    } catch (err) {
      setServerError(err.message || 'Unable to submit booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <Seo title="Booking Confirmed" description="Your dental appointment request has been received." />
        <section className="container pub-section success-section">
          <div className="success-card">
            <div className="success-icon" aria-hidden="true">
              <Icon name="check" size={34} />
            </div>
            <SectionHeading eyebrow="Request received" title="Thank you — your booking is in!" lead={`Reference ${success.reference}. Our team will confirm your appointment by phone shortly.`} />
            <dl className="success-details">
              <div><dt>Reference</dt><dd>{success.reference}</dd></div>
              <div><dt>Treatment</dt><dd>{success.treatment}</dd></div>
              <div><dt>Preferred date</dt><dd>{success.date}</dd></div>
              <div><dt>Preferred time</dt><dd>{success.time}</dd></div>
              <div><dt>Doctor</dt><dd>{success.doctor.name}</dd></div>
            </dl>
            <div className="form-actions center">
              <a href="/" className="btn btn-outline">Back to home</a>
              <a href="/reviews" className="btn btn-primary">Read patient stories</a>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <Seo title="Book an Appointment" description="Request a dental appointment online at Sai Dental Clinic — choose a treatment, date and time and our team will confirm by phone." />
      <section className="page-hero">
        <div className="container page-hero-inner">
          <SectionHeading eyebrow="Book online" title="Book an appointment" lead="Tell us what you need and pick a convenient slot. We confirm every request personally by phone." />
        </div>
      </section>

      <section className="container pub-section booking-grid">
        <div className="booking-story">
          <h2>What happens next?</h2>
          <ol className="steps-list">
            <li><span className="step-num">1</span><div><strong>We call you back</strong><p>Within working hours, our front desk confirms your slot.</p></div></li>
            <li><span className="step-num">2</span><div><strong>Keep your details handy</strong><p>Any medications or allergies help your doctor prepare.</p></div></li>
            <li><span className="step-num">3</span><div><strong>Walk in & get treated</strong><p>Arrive 10 minutes early for your first consultation.</p></div></li>
          </ol>
          <div className="emergency-note">
            <Icon name="phone" size={18} />
            <div><strong>Dental emergency?</strong> <p>Call our emergency line now.</p><a href="tel:+919876543210" className="text-link">+91 98765 43210</a></div>
          </div>
        </div>

        <form className="booking-card" onSubmit={submit} noValidate>
          {serverError && <div className="form-error" role="alert">{serverError}</div>}
          <div className="form-grid two">
            <label className="field">
              <span className="field-label">Full name *</span>
              <input name="name" autoComplete="name" value={form.name} onChange={set('name')} placeholder="Your full name" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label className="field">
              <span className="field-label">Phone *</span>
              <input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </label>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span className="field-label">Email</span>
              <input name="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>
            <label className="field">
              <span className="field-label">Treatment *</span>
              <select name="treatment" value={form.treatment} onChange={set('treatment')}>
                <option value="">Select a treatment…</option>
                {treatmentOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {errors.treatment && <span className="field-error">{errors.treatment}</span>}
            </label>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span className="field-label">Preferred date *</span>
              <input name="preferredDate" type="date" min={todayString()} value={form.preferredDate} onChange={set('preferredDate')} />
              {errors.preferredDate && <span className="field-error">{errors.preferredDate}</span>}
            </label>
            <label className="field">
              <span className="field-label">Preferred time *</span>
              <select name="preferredTime" value={form.preferredTime} onChange={set('preferredTime')}>
                <option value="">Select a time…</option>
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.preferredTime && <span className="field-error">{errors.preferredTime}</span>}
            </label>
          </div>
          <label className="field">
            <span className="field-label">Preferred doctor (optional)</span>
            <select name="preferredDoctorId" value={form.preferredDoctorId} onChange={set('preferredDoctorId')}>
              <option value="">No preference</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Message (optional)</span>
            <textarea rows={4} name="message" value={form.message} onChange={set('message')} placeholder="Any symptoms, concerns, or questions…" />
          </label>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Sending request…' : 'Request appointment'}
          </button>
          <p className="form-note">
            {loading ? 'Loading clinic options… ' : ''}We respect your privacy and never share your details.
          </p>
        </form>
      </section>
    </>
  )
}