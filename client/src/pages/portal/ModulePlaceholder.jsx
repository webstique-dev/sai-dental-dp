import { useParams } from 'react-router-dom'

const LABELS = {
  'check-in': 'Check-in',
  'audit-logs': 'Audit Logs',
  appointments: 'Appointments',
  patients: 'Patients',
  users: 'Users',
  roles: 'Roles & Permissions',
  settings: 'Clinic Settings',
}

export default function ModulePlaceholder() {
  const { module: path } = useParams()
  const label =
    LABELS[path] ||
    path.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div>
      <div className="portal-heading">
        <h1>{label}</h1>
      </div>
      <div className="card">
        <h2 className="card-title">{label} module</h2>
        <p className="card-body-text">
          This module is part of an upcoming phase and is not available yet.
        </p>
      </div>
    </div>
  )
}