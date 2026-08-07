import { useState } from 'react'
import { ASSESSMENT_OPTIONS } from '../../constants/options'

export function SectionCard({ title, description, children }) {
  return (
    <section className="exam-card">
      <header className="exam-card-head">
        <h3 className="exam-card-title">{title}</h3>
        {description && <p className="exam-card-desc">{description}</p>}
      </header>
      <div className="exam-card-body">{children}</div>
    </section>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  textarea = false,
  rows = 3,
}) {
  if (textarea) {
    return (
      <Field label={label}>
        <textarea
          value={value || ''}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    )
  }
  return (
    <Field label={label}>
      <input
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

export function ChoiceStrip({ options, value, onChange }) {
  return (
    <div className="choice-strip" role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`choice-pill${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(selected ? null : opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function AssessmentItem({ label, value, onChange, notesLabel = 'Findings' }) {
  return (
    <div className="assessment-item">
      <div className="assessment-head">
        <span className="assessment-label">{label}</span>
        <ChoiceStrip
          options={ASSESSMENT_OPTIONS}
          value={value.status || 'not-examined'}
          onChange={(status) => onChange({ ...value, status })}
        />
      </div>
      <textarea
        className="assessment-notes"
        rows={2}
        placeholder={`${notesLabel} (optional)`}
        value={value.notes || ''}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
      />
    </div>
  )
}

export function CheckPills({ options, value, onChange }) {
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]
    onChange(next)
  }
  return (
    <div className="check-pills">
      {options.map((opt) => {
        const selected = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={selected}
            className={`check-pill${selected ? ' is-selected' : ''}`}
            onClick={() => toggle(opt)}
          >
            <span className="check-box" aria-hidden="true">
              {selected ? '✓' : ''}
            </span>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export function HabitField({ label, habit, onChange }) {
  const [expanded, setExpanded] = useState(habit.present)
  return (
    <div className="habit-item">
      <div className="habit-head">
        <span className="assessment-label">{label}</span>
        <div className="choice-strip">
          <button
            type="button"
            className={`choice-pill${!habit.present ? ' is-selected' : ''}`}
            onClick={() => {
              onChange({ ...habit, present: false })
              setExpanded(false)
            }}
          >
            No
          </button>
          <button
            type="button"
            className={`choice-pill${habit.present ? ' is-selected' : ''}`}
            onClick={() => {
              onChange({ ...habit, present: true })
              setExpanded(true)
            }}
          >
            Yes
          </button>
        </div>
      </div>
      {expanded && habit.present && (
        <div className="habit-details">
          <TextField label="Frequency" value={habit.frequency} onChange={(v) => onChange({ ...habit, frequency: v })} />
          <TextField label="Duration" value={habit.duration} onChange={(v) => onChange({ ...habit, duration: v })} />
          <TextField label="Notes" value={habit.notes} onChange={(v) => onChange({ ...habit, notes: v })} />
        </div>
      )}
    </div>
  )
}