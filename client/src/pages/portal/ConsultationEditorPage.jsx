import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import {
  SectionCard,
  TextField,
  ChoiceStrip,
  AssessmentItem,
  CheckPills,
  HabitField,
} from '../../components/ui/fields'
import ConfirmationDialog from '../../components/common/ConfirmationDialog'
import { YES_NO_UNKNOWN } from '../../constants/options'
import {
  getConsultation,
  updateConsultation,
  completeConsultation,
} from '../../services/consultationService'
import useAuth from '../../hooks/useAuth'
import ToothChartModule from '../../components/tooth/ToothChartModule'
import DiagnosisSection from '../../components/diagnosis/DiagnosisSection'
import TreatmentPlanSection from '../../components/treatmentPlan/TreatmentPlanSection'
import PrescriptionSection from '../../components/prescription/PrescriptionSection'
import InvestigationSection from '../../components/investigation/InvestigationSection'
import TreatmentExecutionSection from '../../components/treatment/TreatmentExecutionSection'
import FollowUpSection from '../../components/followUp/FollowUpSection'

const STATUS_LABELS = {  draft: 'Draft',
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

  const [consultation, setConsultation] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)

  const canEdit =
    (user.role === 'doctor' || user.role === 'admin') &&
    consultation &&
    consultation.status !== 'completed' &&
    consultation.status !== 'cancelled'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError('')
      try {
        const res = await getConsultation(id)
        if (cancelled) return
        setConsultation(res.consultation)
        setForm(structuredClone(res.consultation))
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load consultation. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const setAt = (path) => (value) => {
    setForm((prev) => {
      if (!prev) return prev
      const shallow = structuredClone(prev)
      const keys = path.split('.')
      let node = shallow
      for (let i = 0; i < keys.length - 1; i += 1) {
        node = node[keys[i]] ??= {}
      }
      node[keys[keys.length - 1]] = value
      return shallow
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
      setNotice('Consultation saved successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save consultation')
    } finally {
      setSaving(false)
    }
  }

  const complete = async () => {
    setCompleting(true)
    setError('')
    setNotice('')
    try {
      const res = await completeConsultation(id)
      setConsultation(res.consultation)
      setForm(structuredClone(res.consultation))
      setShowCompleteConfirm(false)
      setNotice('Consultation completed successfully.')
    } catch (err) {
      setError(err.message || 'Unable to complete consultation')
    } finally {
      setCompleting(false)
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
    return <div className="page-loader">Loading consultation…</div>
  }

  if (error && !consultation) {
    return (
      <div className="state-card">
        <h2>Unable to load consultation. Please try again.</h2>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }

  if (!consultation || !form) return null

  const patient = consultation.patient
  const age =
    patient && patient.dob
      ? patient.age ??
        (new Date().getFullYear() - new Date(patient.dob).getFullYear())
      : '—'

  return (
    <div className="consultation-editor">
      <div className="portal-heading editor-heading">
        <div>
          <button className="link-back inline-flex items-center gap-1" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1>Clinical Consultation</h1>
        </div>
        <span className={`status-badge status-${consultation.status}`}>
          {STATUS_LABELS[consultation.status] || consultation.status}
        </span>
      </div>

      {notice && <div className="form-success">{notice}</div>}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {/* Patient header */}
      <section className="patient-header">
        <div className="patient-header-top">
          <div className="patient-header-name">
            {patient?.firstName} {patient?.lastName}
          </div>
          {patient?.permanentAlerts?.length > 0 && (
            <div className="alert-chip">Alert: {patient.permanentAlerts.join(', ')}</div>
          )}
        </div>
        <div className="patient-header-grid">
          <div className="ph-item"><span>Patient ID</span><b>{patient?.patientId || '—'}</b></div>
          <div className="ph-item"><span>OP No</span><b>{consultation.opNumber || '—'}</b></div>
          <div className="ph-item"><span>Age</span><b>{age}</b></div>
          <div className="ph-item"><span>Gender</span><b>{patient?.gender || '—'}</b></div>
          <div className="ph-item"><span>DOB</span><b>{patient?.dob ? new Date(patient.dob).toLocaleDateString() : '—'}</b></div>
          <div className="ph-item"><span>Phone</span><b>{patient?.phone || '—'}</b></div>
          <div className="ph-item"><span>Doctor</span><b>{consultation.doctor?.name || '—'}</b></div>
          <div className="ph-item">
            <span>Visit</span>
            <b>{consultation.visitDate ? new Date(consultation.visitDate).toLocaleString() : '—'}</b>
          </div>
        </div>
      </section>

      {/* Medical history */}
      <SectionCard title="Medical History">
        <div className="condition-grid">
          {MEDICAL_LIST.map((name) =>
            form.medicalHistory?.conditions?.find((c) => c.name === name) ? (
              <div key={name} className="condition-row">
                <span className="condition-name">{name}</span>
                <ChoiceStrip
                  options={YES_NO_UNKNOWN}
                  value={form.medicalHistory.conditions.find((c) => c.name === name).answer}
                  onChange={(answer) => updateCondition(name, { answer })}
                />
                {(name === 'Other' || name === 'Allergy') && (
                  <div>
                    <TextField
                      label={`${name} details`}
                      value={form.medicalHistory.conditions.find((c) => c.name === name).notes || ''}
                      onChange={(notes) => updateCondition(name, { notes })}
                    />
                  </div>
                )}
              </div>
            ) : null,
          )}
        </div>
        <TextField
          label="Medical history notes"
          textarea
          value={form.medicalHistory?.notes || ''}
          onChange={setAt('medicalHistory.notes')}
        />
      </SectionCard>

      {/* Current medications */}
      <SectionCard title="Current Medications">
        <div className="choice-strip">
          <button
            type="button"
            className={`choice-pill${form.medicalHistory?.takingMedication === 'no' ? ' is-selected' : ''}`}
            onClick={() => setAt('medicalHistory.takingMedication')('no')}
          >
            No current medications
          </button>
          <button
            type="button"
            className={`choice-pill${form.medicalHistory?.takingMedication === 'yes' ? ' is-selected' : ''}`}
            onClick={() => setAt('medicalHistory.takingMedication')('yes')}
          >
            Yes — taking medication
          </button>
        </div>
        {form.medicalHistory?.medications?.map((med, i) => (
          <div className="med-row" key={i}>
            <TextField label="Medicine" value={med.name} onChange={(v) => updateMedication(i, 'name', v)} />
            <TextField label="Dosage" value={med.dosage} onChange={(v) => updateMedication(i, 'dosage', v)} />
            <TextField label="Frequency" value={med.frequency} onChange={(v) => updateMedication(i, 'frequency', v)} />
            <TextField label="Route" value={med.route} onChange={(v) => updateMedication(i, 'route', v)} />
            <TextField label="Duration" value={med.duration} onChange={(v) => updateMedication(i, 'duration', v)} />
            <TextField label="Notes" value={med.notes} onChange={(v) => updateMedication(i, 'notes', v)} />
            <button type="button" className="danger-link" onClick={() => removeMedication(i)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm inline-flex items-center gap-1" onClick={addMedication}>
          <Plus size={12} /> Add medication
        </button>
      </SectionCard>

      {/* Vitals */}
      <SectionCard title="Vitals">
        <div className="form-row">
          <TextField
            label="Systolic (BP)"
            value={form.vitals?.systolic || ''}
            onChange={setAt('vitals.systolic')}
          />
          <TextField
            label="Diastolic (BP)"
            value={form.vitals?.diastolic || ''}
            onChange={setAt('vitals.diastolic')}
          />
          <TextField label="RBS" value={form.vitals?.rbs || ''} onChange={setAt('vitals.rbs')} />
          <TextField label="RBS unit" value={form.vitals?.rbsUnit || 'mg/dL'} onChange={setAt('vitals.rbsUnit')} />
        </div>
        <TextField
          label="Vitals notes"
          textarea
          value={form.vitals?.notes || ''}
          onChange={setAt('vitals.notes')}
        />
      </SectionCard>

      {/* Habits */}
      <SectionCard title="Habits">
        <div className="habits-grid">
          <HabitField
            label="Smoking"
            habit={form.habits?.smoking}
            onChange={setAt('habits.smoking')}
          />
          <HabitField
            label="Tobacco"
            habit={form.habits?.tobacco}
            onChange={setAt('habits.tobacco')}
          />
          <HabitField
            label="Alcohol"
            habit={form.habits?.alcohol}
            onChange={setAt('habits.alcohol')}
          />
          <HabitField
            label="Pan"
            habit={form.habits?.pan}
            onChange={setAt('habits.pan')}
          />
        </div>
      </SectionCard>

      {/* Dental history */}
      <SectionCard title="Dental History">
        <div className="v-row">
          <TextField
            label="Previous dental treatments"
            textarea
            value={form.dentalHistory?.previousTreatments || ''}
            onChange={setAt('dentalHistory.previousTreatments')}
          />
          <TextField
            label="Previous dental problems"
            textarea
            value={form.dentalHistory?.previousProblems || ''}
            onChange={setAt('dentalHistory.previousProblems')}
          />
          <TextField
            label="Previous extractions"
            value={form.dentalHistory?.previousExtractions || ''}
            onChange={setAt('dentalHistory.previousExtractions')}
          />
          <TextField
            label="Previous root canal treatments"
            value={form.dentalHistory?.previousRootCanal || ''}
            onChange={setAt('dentalHistory.previousRootCanal')}
          />
          <TextField
            label="Previous crowns / bridges / implants"
            value={form.dentalHistory?.previousCrownsBridgesImplants || ''}
            onChange={setAt('dentalHistory.previousCrownsBridgesImplants')}
          />
          <TextField
            label="Orthodontic treatment"
            value={form.dentalHistory?.orthodonticTreatment || ''}
            onChange={setAt('dentalHistory.orthodonticTreatment')}
          />
          <TextField
            label="Last dental visit"
            value={form.dentalHistory?.lastDentalVisit || ''}
            onChange={setAt('dentalHistory.lastDentalVisit')}
          />
          <TextField
            label="Dental history clinical notes"
            textarea
            value={form.dentalHistory?.clinicalNotes || ''}
            onChange={setAt('dentalHistory.clinicalNotes')}
          />
        </div>
      </SectionCard>

      {/* Extraoral examination */}
      <SectionCard title="Extraoral Examination">
        <div className="assess-g">
          <AssessmentItem
            label="Facial Symmetry"
            value={form.extraoralExamination?.facialSymmetry}
            onChange={setAt('extraoralExamination.facialSymmetry')}
          />
          <AssessmentItem
            label="TMJ"
            value={form.extraoralExamination?.tmj}
            onChange={setAt('extraoralExamination.tmj')}
          />
          <AssessmentItem
            label="Lymph Nodes"
            value={form.extraoralExamination?.lymphNodes}
            onChange={setAt('extraoralExamination.lymphNodes')}
          />
          <AssessmentItem
            label="Swelling"
            value={form.extraoralExamination?.swelling}
            onChange={setAt('extraoralExamination.swelling')}
          />
        </div>
      </SectionCard>

      {/* Intraoral / soft tissue */}
      <SectionCard title="Intraoral / Soft Tissue Examination">
        <div className="exam-g">
          <AssessmentItem
            label="Labial / Buccal Mucosa"
            value={form.intraoralExamination?.labialBuccalMucosa}
            onChange={setAt('intraoralExamination.labialBuccalMucosa')}
          />
          <AssessmentItem
            label="Tongue"
            value={form.intraoralExamination?.tongue}
            onChange={setAt('intraoralExamination.tongue')}
          />
          <AssessmentItem
            label="Floor of Mouth"
            value={form.intraoralExamination?.floorOfMouth}
            onChange={setAt('intraoralExamination.floorOfMouth')}
          />
          <AssessmentItem
            label="Gingiva"
            value={form.intraoralExamination?.gingiva}
            onChange={setAt('intraoralExamination.gingiva')}
          />
          <AssessmentItem
            label="Hard Palate"
            value={form.intraoralExamination?.hardPalate}
            onChange={setAt('intraoralExamination.hardPalate')}
          />
          <AssessmentItem
            label="Soft Palate"
            value={form.intraoralExamination?.softPalate}
            onChange={setAt('intraoralExamination.softPalate')}
          />
        </div>
      </SectionCard>

      {/* Gingival findings */}
      <SectionCard title="Gingival Examination">
        <CheckPills
          options={GINGIVAL_OPTIONS}
          value={form.gingivalFindings?.findings || []}
          onChange={setAt('gingivalFindings.findings')}
        />
        <TextField
          label="Gingival additional notes"
          textarea
          value={form.gingivalFindings?.notes || ''}
          onChange={setAt('gingivalFindings.notes')}
        />
      </SectionCard>

      {/* Hard tissue */}
      <SectionCard
        title="Hard Tissue Examination"
        description="Digital tooth chart — select a tooth to view history and record findings or treatments."
      >
        <ToothChartModule
          patientId={consultation.patient?.id || consultation.patient?._id}
          consultationId={consultation.id}
          visitId={consultation.visit?.id || consultation.visit?._id}
          readOnly={!canEdit}
          compact
        />
        <TextField
          label="Summary"
          textarea
          value={form.hardTissueExamination?.summary || ''}
          onChange={setAt('hardTissueExamination.summary')}
        />
        <TextField
          label="Notes"
          textarea
          value={form.hardTissueExamination?.notes || ''}
          onChange={setAt('hardTissueExamination.notes')}
        />
      </SectionCard>

      {/* Clinical findings */}
      <SectionCard title="Clinical Findings">
        <textarea
          className="findings-textarea"
          rows={5}
          value={form.clinicalFindings || ''}
          onChange={(e) => setAt('clinicalFindings')(e.target.value)}
        />
      </SectionCard>

      {/* Diagnosis + Treatment Plan */}
      <DiagnosisSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />
      <TreatmentPlanSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />
      <PrescriptionSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />
      <InvestigationSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />
      <TreatmentExecutionSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />
      <FollowUpSection
        patientId={consultation.patient?.id || consultation.patient?._id}
        consultationId={consultation.id}
        visitId={consultation.visit?.id || consultation.visit?._id}
        readOnly={!canEdit}
      />

      {/* Actions */}
      <div className="consult-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
        >
          Cancel / Back
        </button>
        {canEdit && (
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={saveDraft}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCompleteConfirm(true)}
              disabled={completing}
            >
              {completing ? 'Completing…' : 'Complete Consultation'}
            </button>
          </>
        )}
        {consultation.status === 'completed' && (
          <span className="muted">
            Completed {consultation.completedAt
              ? `on ${new Date(consultation.completedAt).toLocaleString()}`
              : ''}
          </span>
        )}
      </div>

      <ConfirmationDialog
        open={showCompleteConfirm}
        title="Complete Consultation?"
        message="Completing this consultation locks it and prevents further edits. Any unsaved changes on this page will be lost."
        confirmText="Complete"
        cancelText="Cancel"
        variant="warning"
        loading={completing}
        loadingText="Completing…"
        onConfirm={complete}
        onCancel={() => setShowCompleteConfirm(false)}
      />
    </div>
  )
}