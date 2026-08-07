import useApiHealth from '../hooks/useApiHealth'

function HealthCard() {
  const { status, data, retry } = useApiHealth()

  return (
    <div className={`health-card health-${status}`}>
      <div className="health-card-head">
        <span className="health-dot" aria-hidden="true" />
        <span className="health-title">API Status</span>
      </div>

      {status === 'loading' && (
        <p className="health-message">Checking server connection...</p>
      )}

      {status === 'error' && (
        <>
          <p className="health-message">
            Backend is unreachable. Make sure the server is running.
          </p>
          <button type="button" className="btn btn-secondary" onClick={retry}>
            Retry
          </button>
        </>
      )}

      {status === 'success' && (
        <>
          <p className="health-message health-ok">{data.message}</p>
          <button type="button" className="btn btn-secondary" onClick={retry}>
            Check again
          </button>
        </>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <section className="container">
      <div className="hero">
        <div className="hero-content">
          <span className="eyebrow">Welcome to</span>
          <h1>Sai Dental Clinic Platform</h1>
          <p>
            A modern, end-to-end digital clinic platform that connects
            appointments, consultation, treatment and billing into one
            seamless workflow.
          </p>
          <div className="hero-actions">
            <a href="#health" className="btn btn-primary">
              Check API health
            </a>
            <a href="/appointments" className="btn btn-outline">
              Book an appointment
            </a>
          </div>
        </div>
        <div className="hero-card" id="health">
          <HealthCard />
        </div>
      </div>
    </section>
  )
}