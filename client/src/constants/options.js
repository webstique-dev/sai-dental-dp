export const YES_NO = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
]

export const YES_NO_UNKNOWN = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'unknown', label: 'Unknown' },
]

export const ASSESSMENT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'abnormal', label: 'Abnormal' },
  { value: 'not-examined', label: 'Not Examined' },
]

export const TOOTH_CONDITION_OPTIONS = [
  { value: 'healthy', label: 'Healthy', code: '' },
  { value: 'caries', label: 'Caries', code: 'D' },
  { value: 'missing', label: 'Missing', code: 'M' },
  { value: 'filling', label: 'Filling', code: 'F' },
  { value: 'rct', label: 'Root Canal Treatment', code: 'RCT' },
  { value: 'crown', label: 'Crown', code: 'Cr' },
  { value: 'bridge', label: 'Bridge', code: 'Br' },
  { value: 'implant', label: 'Implant', code: 'I' },
  { value: 'extraction-required', label: 'Extraction Required', code: 'Ex' },
  { value: 'other', label: 'Other', code: '' },
]

export const TOOTH_CONDITION_BY_VALUE = Object.fromEntries(
  TOOTH_CONDITION_OPTIONS.map((o) => [o.value, o]),
)

export const TOOTH_TREATMENT_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'started', label: 'Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const TOOTH_PROCEDURE_OPTIONS = [
  'Root Canal Treatment',
  'Composite Filling',
  'Glass Ionomer Filling',
  'Crown',
  'Bridge',
  'Implant',
  'Dental Extraction',
  'Scaling & Polishing',
  'Open / Surgical Procedure',
  'Veneer',
  'Bone Graft',
  'Post & Core',
]

export const TOOTH_ROWS = {
  upper: [
    [18, 17, 16, 15, 14, 13, 12, 11],
    [21, 22, 23, 24, 25, 26, 27, 28],
  ],
  lower: [
    [48, 47, 46, 45, 44, 43, 42, 41],
    [31, 32, 33, 34, 35, 36, 37, 38],
  ],
}

export const TOOTH_MAP = Object.fromEntries(
  [...TOOTH_ROWS.upper[0], ...TOOTH_ROWS.upper[1], ...TOOTH_ROWS.lower[0], ...TOOTH_ROWS.lower[1]].map((n) => [n, n]),
)

// ------------------------- Diagnosis & Treatment Plan -------------------------

// Shared, reusable diagnosis library (not hardcoded in components).
export const DIAGNOSIS_CATEGORY_OPTIONS = [
  { value: 'dental', label: 'Dental' },
  { value: 'oral', label: 'Oral' },
  { value: 'systemic', label: 'Systemic' },
  { value: 'other', label: 'Other' },
]

export const DIAGNOSIS_OPTIONS = [
  { name: 'Dental Caries', category: 'dental', defaultTooth: true, procedure: 'Restoration / Filling' },
  { name: 'Deep Dental Caries', category: 'dental', defaultTooth: true, procedure: 'Root Canal Treatment' },
  { name: 'Pulpitis', category: 'dental', defaultTooth: true },
  { name: 'Gingivitis', category: 'oral' },
  { name: 'Periodontitis', category: 'oral' },
  { name: 'Impacted Tooth', category: 'dental', defaultTooth: true, procedure: 'Extraction' },
  { name: 'Malocclusion', category: 'dental' },
  { name: 'Abrasion / Attrition', category: 'dental', defaultTooth: true },
  { name: 'Fractured Tooth', category: 'dental', defaultTooth: true, procedure: 'Crown' },
  { name: 'Missing Tooth', category: 'dental', defaultTooth: true, procedure: 'Implant / Bridge' },
  { name: 'Staining / Discolouration', category: 'dental', defaultTooth: true },
  { name: 'Halitosis', category: 'oral' },
  { name: 'Oral Ulcer', category: 'oral' },
  { name: 'Temporomandibular Joint Disorder', category: 'oral' },
  { name: 'Root Stump', category: 'dental', defaultTooth: true, procedure: 'Extraction' },
  { name: 'Full Denture Need', category: 'dental' },
  { name: 'Other', category: 'other' },
]

export const DIAGNOSIS_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ruled-out', label: 'Ruled Out' },
  { value: 'historical', label: 'Historical' },
]

export const PLAN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'proposed', label: 'Proposed' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'partially-completed', label: 'Partially Completed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const PLAN_STATUS_BY_VALUE = Object.fromEntries(PLAN_STATUS_OPTIONS.map((o) => [o.value, o.label]))

export const PLAN_ITEM_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const PLAN_ITEM_STATUS_BY_VALUE = Object.fromEntries(PLAN_ITEM_STATUS_OPTIONS.map((o) => [o.value, o.label]))

export const PLAN_PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export const PLAN_PRIORITY_BY_VALUE = Object.fromEntries(PLAN_PRIORITY_OPTIONS.map((o) => [o.value, o.label]))

export const TOOTH_DROPDOWN_OPTIONS = [
  { value: 0, label: 'General (no specific tooth)' },
  ...[11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48].map((n) => ({ value: n, label: `Tooth ${n}` })),
]

// ------------------------- Prescription -------------------------

export const PRESCRIPTION_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'partially-dispensed', label: 'Partially Dispensed' },
  { value: 'dispensed', label: 'Dispensed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const PRESCRIPTION_STATUS_BY_VALUE = Object.fromEntries(PRESCRIPTION_STATUS_OPTIONS.map((o) => [o.value, o.label]))

export const FREQUENCY_OPTIONS = [
  { value: 'once-daily', label: 'Once daily' },
  { value: 'twice-daily', label: 'Twice daily' },
  { value: 'three-times-daily', label: 'Three times daily' },
  { value: 'four-times-daily', label: 'Four times daily' },
  { value: 'every-4-hours', label: 'Every 4 hours' },
  { value: 'every-6-hours', label: 'Every 6 hours' },
  { value: 'every-8-hours', label: 'Every 8 hours' },
  { value: 'every-12-hours', label: 'Every 12 hours' },
  { value: 'as-needed', label: 'As needed' },
  { value: 'other', label: 'Other' },
]

export const FREQUENCY_BY_VALUE = Object.fromEntries(FREQUENCY_OPTIONS.map((o) => [o.value, o.label]))

export const DOSAGE_UNIT_OPTIONS = [
  { value: 'mg', label: 'mg' },
  { value: 'g', label: 'g' },
  { value: 'mcg', label: 'mcg' },
  { value: 'ml', label: 'ml' },
  { value: '%', label: '%' },
  { value: 'IU', label: 'IU' },
  { value: 'units', label: 'units' },
  { value: 'tablet', label: 'tablet' },
  { value: 'sachet', label: 'sachet' },
]

export const DURATION_UNIT_OPTIONS = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
  { value: 'month', label: 'Month(s)' },
]

export const ROUTE_OPTIONS = [
  { value: 'oral', label: 'Oral' },
  { value: 'topical', label: 'Topical' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'intramuscular', label: 'Intramuscular' },
  { value: 'intravenous', label: 'Intravenous' },
  { value: 'other', label: 'Other' },
]

export const ROUTE_BY_VALUE = Object.fromEntries(ROUTE_OPTIONS.map((o) => [o.value, o.label]))

export const FOOD_INSTRUCTION_OPTIONS = [
  { value: 'before-food', label: 'Before food' },
  { value: 'after-food', label: 'After food' },
  { value: 'with-food', label: 'With food' },
  { value: 'no-preference', label: 'No preference' },
]

export const FOOD_INSTRUCTION_BY_VALUE = Object.fromEntries(FOOD_INSTRUCTION_OPTIONS.map((o) => [o.value, o.label]))

// Reusable medicine library (not hardcoded in components).
export const MEDICINE_LIBRARY = [
  'Amoxicillin',
  'Amoxicillin + Clavulanic Acid',
  'Metronidazole',
  'Ciprofloxacin',
  'Azithromycin',
  'Clindamycin',
  'Cephalexin',
  'Doxycycline',
  'Paracetamol',
  'Ibuprofen',
  'Diclofenac',
  'Ketorolac',
  'Aceclofenac',
  'Chlorhexidine Mouthwash',
  'Chlorhexidine Gel',
  'Metrogel (Ointment)',
  'Calcium / Vitamin D3',
  'Vitamin B-Complex',
  'Multivitamin',
  'Zincovit',
  'Anti-inflammatory Gel',
  'Steroid Mouthwash',
  'Hydrocortisone Gel',
  'Nystatin Oral Suspension',
  'Saline Mouth Rinse',
  'Benzocaine Gel',
  'Lignocaine Gel',
  'Aspirin',
  'Dexamethasone',
  'Prednisolone',
  'Other',
]

// ------------------------- Investigation -------------------------

export const INVESTIGATION_TYPE_OPTIONS = [
  { value: 'rvg-iopa', label: 'RVG / IOPA' },
  { value: 'opg', label: 'OPG' },
  { value: 'cbct', label: 'CBCT' },
  { value: 'other', label: 'Other' },
]

export const INVESTIGATION_TYPE_BY_VALUE = Object.fromEntries(INVESTIGATION_TYPE_OPTIONS.map((o) => [o.value, o.label]))

export const INVESTIGATION_STATUS_OPTIONS = [
  { value: 'requested', label: 'Requested' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'result-available', label: 'Result Available' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const INVESTIGATION_STATUS_BY_VALUE = Object.fromEntries(INVESTIGATION_STATUS_OPTIONS.map((o) => [o.value, o.label]))

export const INVESTIGATION_PRIORITY_OPTIONS = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
]

export const INVESTIGATION_PRIORITY_BY_VALUE = Object.fromEntries(INVESTIGATION_PRIORITY_OPTIONS.map((o) => [o.value, o.label]))

// ------------------------- Treatment Execution -------------------------

export const TREATMENT_RECORD_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'partially-completed', label: 'Partially Completed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'deferred', label: 'Deferred' },
]

export const TREATMENT_RECORD_STATUS_BY_VALUE = Object.fromEntries(
  TREATMENT_RECORD_STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

export const TREATMENT_OUTCOME_OPTIONS = [
  { value: 'successful', label: 'Successful' },
  { value: 'acceptable', label: 'Acceptable' },
  { value: 'satisfactory', label: 'Satisfactory' },
  { value: 'complicated', label: 'Complicated' },
  { value: 'referred', label: 'Referred' },
]

export const TREATMENT_OUTCOME_BY_VALUE = Object.fromEntries(
  TREATMENT_OUTCOME_OPTIONS.map((o) => [o.value, o.label]),
)

// ------------------------- Follow-up -------------------------

export const FOLLOW_UP_TYPE_OPTIONS = [
  { value: 'review', label: 'Review' },
  { value: 'post-operative-review', label: 'Post-operative Review' },
  { value: 'treatment-continuation', label: 'Treatment Continuation' },
  { value: 'treatment-completion', label: 'Treatment Completion' },
  { value: 'periodic-check', label: 'Periodic Check' },
  { value: 'other', label: 'Other' },
]

export const FOLLOW_UP_TYPE_BY_VALUE = Object.fromEntries(
  FOLLOW_UP_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

export const FOLLOW_UP_STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
]

export const FOLLOW_UP_STATUS_BY_VALUE = Object.fromEntries(
  FOLLOW_UP_STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

export const REMINDER_STATUS_BY_VALUE = {
  pending: 'Pending',
  sent: 'Sent',
  confirmed: 'Confirmed',
  completed: 'Completed',
  missed: 'Missed',
}

// Editable record statuses shown while a record is live (completed is terminal).
export const TREATMENT_RECORD_EDITABLE_STATUSES = [
  'planned',
  'in-progress',
  'partially-completed',
  'deferred',
]

// ------------------------- Billing & Payments -------------------------

export const INVOICE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const INVOICE_STATUS_BY_VALUE = Object.fromEntries(
  INVOICE_STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

export const INVOICE_PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially-paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
]

export const INVOICE_PAYMENT_STATUS_BY_VALUE = Object.fromEntries(
  INVOICE_PAYMENT_STATUS_OPTIONS.map((o) => [o.value, o.label]),
)

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

export const PAYMENT_METHOD_BY_VALUE = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((o) => [o.value, o.label]),
)

export const PAYMENT_TYPE_BY_VALUE = {
  payment: 'Payment',
  refund: 'Refund',
}

export const DISCOUNT_TYPE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'fixed', label: 'Fixed (₹)' },
  { value: 'percent', label: 'Percent (%)' },
]

export const DISCOUNT_TYPE_BY_VALUE = Object.fromEntries(
  DISCOUNT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

export const SERVICE_CATEGORY_OPTIONS = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'other', label: 'Other' },
]

export const SERVICE_CATEGORY_BY_VALUE = Object.fromEntries(
  SERVICE_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
)

export function formatRupees(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

// ------------------------- Pharmacy / Inventory -------------------------

export const MEDICINE_CATEGORY_OPTIONS = [
  { value: 'antibiotic', label: 'Antibiotic' },
  { value: 'analgesic', label: 'Analgesic' },
  { value: 'anti-inflammatory', label: 'Anti-inflammatory' },
  { value: 'mouthwash', label: 'Mouthwash' },
  { value: 'anesthetic', label: 'Anesthetic' },
  { value: 'steroidal', label: 'Steroidal' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'other', label: 'Other' },
]

export const MEDICINE_CATEGORY_BY_VALUE = Object.fromEntries(
  MEDICINE_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
)

export const STOCK_ALERT_OPTIONS = [
  { value: 'lowStock', label: 'Low stock' },
  { value: 'outOfStock', label: 'Out of stock' },
  { value: 'expiringSoon', label: 'Expiring soon' },
  { value: 'expired', label: 'Expired' },
]

export function stockAlertLabels(med) {
  const labels = []
  if (med.outOfStock) labels.push('Out of stock')
  if (med.lowStock) labels.push('Low stock')
  if (med.expiringSoon) labels.push('Expiring soon')
  if (med.expired) labels.push('Expired')
  return labels
}

export const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}
