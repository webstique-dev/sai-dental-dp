export const NAV_SECTIONS = [
  {
    section: 'Overview',
    items: [{ to: '/portal', label: 'Dashboard', end: true }],
  },
  {
    section: 'Patients',
    items: [
      { to: '/portal/patients', label: 'Patients', roles: ['admin', 'doctor', 'receptionist'] },
      { to: '/portal/appointments', label: 'Appointments', roles: ['admin', 'doctor', 'receptionist'] },
      { to: '/portal/check-in', label: 'Check-in', roles: ['admin', 'receptionist'] },
    ],
  },
  {
    section: 'Clinical',
    items: [
      { to: '/portal/consultations', label: 'Consultations', roles: ['doctor', 'admin'] },
      { to: '/portal/tooth-chart', label: 'Tooth Chart', roles: ['doctor'] },
      { to: '/portal/diagnoses', label: 'Diagnoses', roles: ['doctor'] },
      { to: '/portal/treatment-plans', label: 'Treatment Plans', roles: ['doctor'] },
      { to: '/portal/prescriptions', label: 'Prescriptions', roles: ['doctor', 'pharmacy'] },
      { to: '/portal/investigations', label: 'Investigations', roles: ['doctor'] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/portal/billing', label: 'Billing', roles: ['admin', 'receptionist'] },
      { to: '/portal/pharmacy', label: 'Pharmacy', roles: ['admin', 'pharmacy'] },
      { to: '/portal/inventory', label: 'Inventory', roles: ['admin', 'pharmacy'] },
      { to: '/portal/follow-ups', label: 'Follow-ups', roles: ['admin', 'doctor', 'receptionist'] },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/portal/users', label: 'Users', roles: ['admin'] },
      { to: '/portal/roles', label: 'Roles & Permissions', roles: ['admin'] },
      { to: '/portal/settings', label: 'Clinic Settings', roles: ['admin'] },
      { to: '/portal/audit-logs', label: 'Audit Logs', roles: ['admin'] },
    ],
  },
]

export function navForRole(role) {
  return NAV_SECTIONS.map(({ section, items }) => ({
    section,
    items: items.filter(
      (item) => !item.roles || item.roles.includes(role),
    ),
  })).filter((group) => group.items.length > 0)
}