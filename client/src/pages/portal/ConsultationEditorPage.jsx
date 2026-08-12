import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, History, FileText, X, CheckCircle2, Calendar, Clock, Stethoscope, Eye, AlertCircle } from 'lucide-react'
import {
  SectionCard,
  TextField,
  ChoiceStrip,
  AssessmentItem,
  CheckPills,
  HabitField,
} from '../../components/ui/fields'
import ConfirmationDialog from '../../components/common/ConfirmationDialog'
import { Modal } from '../../components/common/modal'
import { useNotification } from '../../components/common/notification'
import { YES_NO_UNKNOWN } from '../../constants/options'
import {
  getConsultation,
  updateConsultation,
  completeConsultation,
  patientConsultations,
} from '../../services/consultationService'
import { patientDiagnoses } from '../../services/diagnosisService'
import { patientPrescriptions } from '../../services/prescriptionService'
import { patientTreatmentRecords } from '../../services/treatmentRecordService'
import { createAppointment } from '../../services/appointmentService'
import { publicService } from '../../services/publicService'
import useAuth from '../../hooks/useAuth'
import ToothChartModule from '../../components/tooth/ToothChartModule'
import DiagnosisSection from '../../components/diagnosis/DiagnosisSection'
import TreatmentPlanSection from '../../components/treatmentPlan/TreatmentPlanSection'
import PrescriptionSection from '../../components/prescription/PrescriptionSection'
import InvestigationSection from '../../components/investigation/InvestigationSection'
import TreatmentExecutionSection from '../../components/treatment/TreatmentExecutionSection'
import FollowUpSection from '../../components/followUp/FollowUpSection'

import ClinicalExamination from '../../components/clinical/ClinicalExamination'

const STATUS_LABELS = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const MEDICAL_LIST = [
  'Diabetes Mellitus',
  'Hypertension',
  'Asthma',
  'Allergy',
  'Pregnancy',
  'Cardiac Disease',
  'Epilepsy',
  'Thyroid Disorder',
  'Hepatitis',
  'Bleeding Disorder',
  'Other',
]

const GINGIVAL_OPTIONS = [
  'Healthy',
  'Gingivitis',
  'Periodontitis',
  'Enlargement',
  'Recession',
  'Bleeding on Probing',
]

export default function ConsultationEditorPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const notify = useNotification()

  const [consultation, setConsultation] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Confirmation Close Dialog state
  const [showCloseConfirmDialog, setShowCloseConfirmDialog] = useState(false)

  // Pre-completion Summary Review Modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  // Post-completion Follow-Up Modal state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [doctorsList, setDoctorsList] = useState([])
  const [followUpForm, setFollowUpForm] = useState({
    date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    time: '10:00 AM',
    doctorId: user?._id || user?.id || '',
    reason: 'Routine follow-up checkup after dental treatment',
  })
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false)

  // Patient EMR History drawer state
  const [showEmrHistory, setShowEmrHistory] = useState(false)
  const [emrData, setEmrData] = useState({ consultations: [], diagnoses: [], prescriptions: [], records: [] })
  const [emrLoading, setEmrLoading] = useState(false)

  const loadEmrHistory = async (patientId) => {
    if (!patientId) return
    setEmrLoading(true)
    try {
      const [cRes, dRes, pRes, trRes] = await Promise.all([
        patientConsultations(patientId),
        patientDiagnoses(patientId),
        patientPrescriptions(patientId),
        patientTreatmentRecords(patientId),
      ])
      setEmrData({
        consultations: cRes.consultations || cRes.items || [],
        diagnoses: dRes.diagnoses || dRes.items || [],
        prescriptions: pRes.prescriptions || pRes.items || [],
        records: trRes.treatmentRecords || trRes.items || [],
      })
    } catch {
      // ignore
    } finally {
      setEmrLoading(false)
    }
  }

  useEffect(() => {
    let unmounted = false
    setLoading(true)
    setError('')
    getConsultation(id)
      .then((res) => {
        if (unmounted) return
        setConsultation(res.consultation)
        setForm(structuredClone(res.consultation))

        const patId = res.consultation?.patient?._id || res.consultation?.patient?.id || res.consultation?.patient
        if (patId) {
          loadEmrHistory(patId)
        }
      })
      .catch((err) => {
        if (!unmounted) setError(err.message || 'Failed to load consultation')
      })
      .finally(() => {
        if (!unmounted) setLoading(false)
      })

    publicService.getDoctors()
      .then((docs) => setDoctorsList(Array.isArray(docs) ? docs : docs?.doctors || []))
      .catch(() => {})

    return () => {
      unmounted = true
    }
  }, [id])

  const canEdit = (user?.role === 'doctor' || user?.role === 'admin') && consultation?.status !== 'completed'

  const setAt = (path) => (value) => {
    setForm((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      const parts = path.split('.')
      let cur = next
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {}
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = value
      return next
    })
  }

  const clinicalPayload = useMemo(() => {
    if (!form) return null
    const {
      visitDate,
      medicalHistory,
      vitals,
      habits,
      dentalHistory,
      extraoralExamination,
      intraoralExamination,
      gingivalFindings,
      hardTissueExamination,
      clinicalFindings,
      clinicalExamination,
    } = form
    return {
      visitDate,
      medicalHistory,
      vitals,
      habits,
      dentalHistory,
      extraoralExamination,
      intraoralExamination,
      gingivalFindings,
      hardTissueExamination,
      clinicalFindings,
      clinicalExamination,
    }
  }, [form])

  const saveDraft = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await updateConsultation(id, clinicalPayload)
      setConsultation(res.consultation)
      setForm(structuredClone(res.consultation))
      notify.success('Consultation draft saved successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save consultation')
      notify.error(err.message || 'Unable to save consultation')
    } finally {
      setSaving(false)
    }
  }

  // Final Complete Handler after Reviewing Summary
  const complete = async () => {
    setCompleting(true)
    setError('')
    setNotice('')
    try {
      // Save pending clinical edits first
      if (clinicalPayload) {
        await updateConsultation(id, clinicalPayload)
      }
      const res = await completeConsultation(id)
      setConsultation(res.consultation)
      setForm(structuredClone(res.consultation))
      setShowCloseConfirmDialog(false)
      setShowSummaryModal(false)

      notify.success('Consultation completed and closed successfully.')
      navigate('/portal/consultations')
    } catch (err) {
      const msg = err.message || 'Unable to complete consultation'
      setError(msg)
      notify.error(msg)
    } finally {
      setCompleting(false)
    }
  }

  // Schedule Follow-Up Appointment Handler
  const handleScheduleFollowUp = async (e) => {
    if (e) e.preventDefault()
    setFollowUpSubmitting(true)
    try {
      const patId = consultation.patient?._id || consultation.patient?.id || consultation.patient
      await createAppointment({
        patientId: patId,
        doctorId: followUpForm.doctorId || user?._id || user?.id,
        date: followUpForm.date,
        time: followUpForm.time,
        type: 'Follow-up',
        source: 'existing',
        reason: followUpForm.reason,
      })

      notify.success(`Follow-up appointment scheduled for ${followUpForm.date}!`)
      setShowFollowUpModal(false)
    } catch (err) {
      notify.error(err.message || 'Failed to schedule follow-up appointment')
    } finally {
      setFollowUpSubmitting(false)
    }
  }

  const updateMedication = (index, field, value) => {
    setForm((prev) => {
      const next = structuredClone(prev)
      next.medicalHistory.medications[index][field] = value
      return next
    })
  }

  const addMedication = () => {
    setForm((prev) => {
      const next = structuredClone(prev)
      next.medicalHistory.medications.push({
        name: '',
        dosage: '',
        frequency: '',
        route: '',
        duration: '',
        notes: '',
      })
      return next
    })
  }

  const removeMedication = (index) => {
    setForm((prev) => {
      const next = structuredClone(prev)
      next.medicalHistory.medications.splice(index, 1)
      return next
    })
  }

  const updateCondition = (name, patch) => {
    setForm((prev) => {
      const next = structuredClone(prev)
      const cond = next.medicalHistory.conditions.find((c) => c.name === name)
      if (cond) Object.assign(cond, patch)
      return next
    })
  }

  if (loading) {
    return (
      <div className="portal-page py-12 text-center">
        <p className="text-muted">Loading consultation session...</p>
      </div>
    )
  }

  if (error || !consultation || !form) {
    return (
      <div className="portal-page">
        <div className="alert alert-danger" role="alert">
          {error || 'Consultation not found'}
        </div>
        <button type="button" className="btn btn-secondary mt-4" onClick={() => navigate('/portal/consultations')}>
          Back to Consultations Hub
        </button>
      </div>
    )
  }

  const patient = consultation.patient || {}
  const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient'

  return (
    <div className="portal-page">
      {/* Top Navigation & Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/portal/consultations')}>
            <ArrowLeft size={16} /> Consultations
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
              Clinical Dental Consultation — Session #{consultation.consultationNumber || consultation.id?.slice(-6)}
            </h1>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Doctor: <strong>Dr. {consultation.doctor?.name || user?.firstName || 'Doctor'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`badge ${consultation.status === 'completed' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '13px', padding: '6px 12px' }}>
            {STATUS_LABELS[consultation.status] || consultation.status}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowEmrHistory(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <History size={16} /> EMR History Drawer
          </button>
        </div>
      </div>

      {notice && <div className="alert alert-success mb-4">{notice}</div>}

      {/* Patient Header Banner */}
      <div className="card mb-6" style={{ background: '#fff', padding: '18px 22px', borderRadius: '12px', marginBottom: '24px', borderLeft: '5px solid var(--color-forest)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-forest)' }}>
              {patient.title ? `${patient.title}. ` : ''}{patientName}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
              PAT-ID: <span className="badge badge-subtle">{patient.patientId || '—'}</span> • Age: {patient.age || '—'} yrs • Gender: <span style={{ textTransform: 'capitalize' }}>{patient.gender || '—'}</span> • Phone: {patient.phone || '—'} • Blood: <span className="badge badge-info">{patient.bloodGroup || 'unknown'}</span>
            </div>
          </div>

          {/* Quick Vitals Summary Badges */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>BP Vitals</span>
              <strong>{form.vitals?.systolic || '—'}/{form.vitals?.diastolic || '—'} mmHg</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>RBS Glucose</span>
              <strong>{form.vitals?.rbs || '—'} {form.vitals?.rbsUnit || 'mg/dL'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 1: PREVIOUS CONSULTATION HISTORY (READ-ONLY) ── */}
      <SectionCard title="Previous Patient Consultations & EMR Medical History">
        <p className="field-desc" style={{ marginBottom: '16px', color: '#64748b', fontSize: '13px' }}>
          Read-only historical consultations across attending doctors for this patient:
        </p>

        {emrLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            Loading patient history...
          </div>
        ) : emrData.consultations.filter((c) => (c._id || c.id) !== (consultation._id || consultation.id)).length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
            No previous consultation history found for this patient.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {emrData.consultations
              .filter((c) => (c._id || c.id) !== (consultation._id || consultation.id))
              .map((prevCons) => (
                <div
                  key={prevCons._id || prevCons.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                        {new Date(prevCons.visitDate || prevCons.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '12px' }}>
                        Attending Doctor: <strong>Dr. {prevCons.doctor?.name || 'Doctor'}</strong>
                      </span>
                    </div>
                    <span className={`badge ${prevCons.status === 'completed' ? 'badge-success' : 'badge-subtle'}`}>
                      {prevCons.status || 'completed'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '13px' }}>
                    {prevCons.clinicalFindings?.primaryDiagnosis && (
                      <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>DIAGNOSIS</span>
                        <strong>{prevCons.clinicalFindings.primaryDiagnosis}</strong>
                      </div>
                    )}

                    {prevCons.hardTissueExamination?.findings?.length > 0 && (
                      <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>TOOTH CHART FINDINGS</span>
                        <strong>{prevCons.hardTissueExamination.findings.map((f) => `Tooth ${f.tooth}: ${f.condition}`).join(', ')}</strong>
                      </div>
                    )}

                    {prevCons.clinicalFindings?.notes && (
                      <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: 600 }}>CLINICAL NOTES</span>
                        <span>{prevCons.clinicalFindings.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </SectionCard>

      {/* ── STEP 2: MEDICAL HISTORY & VITALS ── */}
      <SectionCard title="Medical History & Medical Risk Assessment">
        <p className="field-desc">Select active medical conditions and risk factors for dental procedures:</p>
        <div className="med-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {MEDICAL_LIST.map((name) => {
            const cond = form.medicalHistory?.conditions?.find((c) => c.name === name)
            const active = cond?.status === 'yes'
            return (
              <button
                key={name}
                type="button"
                className={`choice-pill${active ? ' is-selected' : ''}`}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => updateCondition(name, { status: active ? 'no' : 'yes' })}
              >
                {name} {active ? '✓' : ''}
              </button>
            )
          })}
        </div>

        <TextField
          label="Current Medications & Allergies Notes"
          textarea
          value={form.medicalHistory?.notes || ''}
          onChange={setAt('medicalHistory.notes')}
        />
      </SectionCard>

      {/* Vitals */}
      <SectionCard title="Patient Vitals">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <TextField label="Systolic (BP)" value={form.vitals?.systolic || ''} onChange={setAt('vitals.systolic')} />
          <TextField label="Diastolic (BP)" value={form.vitals?.diastolic || ''} onChange={setAt('vitals.diastolic')} />
          <TextField label="RBS Glucose" value={form.vitals?.rbs || ''} onChange={setAt('vitals.rbs')} />
          <TextField label="RBS Unit" value={form.vitals?.rbsUnit || 'mg/dL'} onChange={setAt('vitals.rbsUnit')} />
        </div>
      </SectionCard>

      {/* ── DOCTOR CLINICAL EXAMINATION (EXTRAORAL, INTRAORAL, FDI TOOTH CHART) ── */}
      <ClinicalExamination
        data={form.clinicalExamination || {}}
        onChange={(nextExam) => setForm({ ...form, clinicalExamination: nextExam })}
        readOnly={!canEdit}
      />

      {/* ── STEP 5: DIAGNOSIS & TREATMENT PLAN ── */}
      <DiagnosisSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id || consultation._id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />

      <TreatmentPlanSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id || consultation._id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />

      {/* ── STEP 6: PRESCRIPTION ── */}
      <PrescriptionSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id || consultation._id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />

      {/* ── STEP 7: INVESTIGATIONS ── */}
      <InvestigationSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id || consultation._id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />

      <TreatmentExecutionSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id || consultation._id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />

      <FollowUpSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id || consultation._id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />

      {/* ── ACTIONS BAR ── */}
      <div className="consult-actions card" style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/portal/consultations')}
        >
          Back to Consultations
        </button>

        {canEdit && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={saveDraft}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCloseConfirmDialog(true)}
              disabled={completing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <CheckCircle2 size={16} /> Close Consultation
            </button>
          </div>
        )}

        {consultation.status === 'completed' && (
          <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
            ✓ Consultation Completed {consultation.completedAt ? `on ${new Date(consultation.completedAt).toLocaleString('en-IN')}` : ''}
          </span>
        )}
      </div>

      {/* ── CLOSE CONSULTATION CONFIRMATION POPUP ── */}
      <ConfirmationDialog
        open={showCloseConfirmDialog}
        title="Close Consultation"
        message="Are you sure you want to close this consultation?"
        confirmText="Confirm"
        cancelText="Cancel"
        loading={completing}
        onConfirm={complete}
        onCancel={() => setShowCloseConfirmDialog(false)}
      />

      {/* ── STEP 8: PRE-COMPLETION CONSULTATION SUMMARY REVIEW MODAL ── */}
      <Modal
        open={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title="Consultation Summary Review"
        subtitle="Review clinical findings, tooth chart, diagnosis, treatment plan, and prescription before finalizing."
        maxWidth="700px"
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Patient Overview */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-forest)' }}>
              Patient Information
            </h4>
            <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
              <div><strong>Name:</strong> {patientName} ({patient.patientId || 'PAT-ID'})</div>
              <div><strong>Vitals:</strong> BP {form.vitals?.systolic || '—'}/{form.vitals?.diastolic || '—'} mmHg • RBS {form.vitals?.rbs || '—'} {form.vitals?.rbsUnit || 'mg/dL'}</div>
            </div>
          </div>

          {/* Tooth Examination Summary */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-forest)' }}>
              Tooth Examination Findings
            </h4>
            <p style={{ fontSize: '13px', margin: 0 }}>
              {form.hardTissueExamination?.summary || 'No tooth examination summary entered.'}
            </p>
          </div>

          {/* Clinical Findings & Notes */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-forest)' }}>
              Clinical Findings & Notes
            </h4>
            <p style={{ fontSize: '13px', margin: 0 }}>
              {form.clinicalFindings || 'No additional clinical findings entered.'}
            </p>
          </div>

          {/* Summary Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowSummaryModal(false)}>
              Back to Editing
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={complete}
              disabled={completing}
              style={{ fontWeight: 600 }}
            >
              {completing ? 'Completing…' : 'Confirm & Complete Consultation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── STEP 10: FOLLOW-UP APPOINTMENT SCHEDULING MODAL ── */}
      <Modal
        open={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        title="Schedule Follow-Up Appointment"
        subtitle={`Consultation completed! Schedule a follow-up visit for ${patientName}?`}
        maxWidth="500px"
      >
        <form onSubmit={handleScheduleFollowUp}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Follow-up Date</label>
            <input
              type="date"
              className="form-control"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={followUpForm.date}
              onChange={(e) => setFollowUpForm({ ...followUpForm, date: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Time Slot</label>
            <select
              className="form-control"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={followUpForm.time}
              onChange={(e) => setFollowUpForm({ ...followUpForm, time: e.target.value })}
            >
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:00 AM">10:00 AM</option>
              <option value="11:00 AM">11:00 AM</option>
              <option value="02:00 PM">02:00 PM</option>
              <option value="04:00 PM">04:00 PM</option>
              <option value="06:00 PM">06:00 PM</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Assign Doctor</label>
            <select
              className="form-control"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={followUpForm.doctorId}
              onChange={(e) => setFollowUpForm({ ...followUpForm, doctorId: e.target.value })}
            >
              {doctorsList.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  Dr. {d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim()}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Reason / Notes</label>
            <input
              type="text"
              className="form-control"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={followUpForm.reason}
              onChange={(e) => setFollowUpForm({ ...followUpForm, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowFollowUpModal(false)}>
              Skip Follow-Up
            </button>
            <button type="submit" className="btn btn-primary" disabled={followUpSubmitting} style={{ fontWeight: 600 }}>
              {followUpSubmitting ? 'Scheduling...' : 'Schedule Follow-Up Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── PATIENT EMR HISTORY DRAWER ── */}
      <Modal
        open={showEmrHistory}
        onClose={() => setShowEmrHistory(false)}
        title={`Patient EMR History — ${patientName}`}
        maxWidth="650px"
      >
        {emrLoading ? (
          <p className="text-muted py-4">Loading patient EMR history...</p>
        ) : (
          <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-forest)' }}>
                Past Consultations ({emrData.consultations.length})
              </h4>
              {emrData.consultations.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '12px' }}>No previous consultations recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {emrData.consultations.map((c) => (
                    <div key={c._id || c.id} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Session #{c.consultationNumber || c.id?.slice(-6)}</span>
                      <span className="badge badge-subtle">{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-forest)' }}>
                Diagnoses & Treatment History ({emrData.diagnoses.length})
              </h4>
              {emrData.diagnoses.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '12px' }}>No recorded diagnoses.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {emrData.diagnoses.map((d) => (
                    <div key={d._id || d.id} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                      <strong>{d.condition || d.name}</strong> — {d.notes || 'No notes'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}