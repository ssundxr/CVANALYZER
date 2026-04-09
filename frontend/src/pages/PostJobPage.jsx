import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api/client'

// ── Tag/chip input ──────────────────────────────────────────────────────────
function TagInput({ value = [], onChange, suggestions = [], placeholder }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)

  const add = (val) => {
    const v = val.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setInput('')
    setOpen(false)
  }

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i))

  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  ).slice(0, 8)

  return (
    <div style={{ position: 'relative' }}>
      <div className="tag-input-wrap">
        {value.map((t, i) => (
          <span key={i} className="tag">
            {t} <button type="button" className="tag-del" onClick={() => remove(i)}>×</button>
          </span>
        ))}
        <input
          className="tag-bare-input"
          value={input}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={e => {
            if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); add(input) }
            if (e.key === 'Backspace' && !input && value.length) remove(value.length - 1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#111', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius)',
          marginTop: 4, overflow: 'hidden',
        }}>
          {filtered.map((s, i) => (
            <div key={i}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
              onMouseDown={() => add(s)}
              onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Steps progress bar ──────────────────────────────────────────────────────
function Steps({ current, steps }) {
  return (
    <div className="wizard-steps">
      {steps.map((s, i) => (
        <>
          <div key={i} className="wizard-step">
            <div className={`step-num ${i < current ? 'done' : i === current ? 'current' : ''}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`step-label ${i === current ? 'current' : ''}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div key={`d-${i}`} className="step-divider" />}
        </>
      ))}
    </div>
  )
}

const STEPS = ['Employer & Job', 'Salary & Candidate', 'Skills & Experience', 'Settings & Media']

const EMPTY = {
  status: 'draft',
  employer_details: { type_of_company: '', company_name: '', publish_this_job: false, expiry_date: null },
  job_details: {
    job_title: '', job_type: '', job_location_type: '', industry: '', sub_industry: '',
    functional_area: '', designation: '', roles_and_responsibilities: '', desired_candidate_profile: '',
    keywords: [], number_of_vacancies: 1, country: '', state: '', city: '',
  },
  salary_details: { currency: 'AED', minimum_salary: '', maximum_salary: '', hide_salary_from_job_seekers: false, other_benefits: '' },
  candidate_profile: {
    gender: '', nationality: '', preferred_countries: [], preferred_states: [], preferred_cities: [],
    languages_known: [], driving_license: '', availability: '', visa_status: '',
    age_range: { min: '', max: '' },
  },
  experience_requirement: {
    work_experience_years: { min: '', max: '' },
    gcc_experience_years: { min: '', max: '' },
  },
  education_requirements: [],
  skills_requirement: { functional_skills: [], professional_skills: [], it_skills: [] },
  custom_questions: [],
  recruiter_instructions: '',
  application_mode: '',
  assessment_config: {
    assessment_name: '', screening_fields: [], knowledge_sources: [], goals: [],
    difficulty: 'Intermediate', competencies: [], delivery_rules: [], question_plan: [],
  },
}

export default function PostJobPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY)
  const [ref, setRef] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    api.referenceData().then(d => setRef(d.reference_data)).catch(console.error)
  }, [])

  const set = (path, val) => {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = val
      return next
    })
  }

  const F = (path) => {
    const keys = path.split('.')
    let v = form
    for (const k of keys) v = v?.[k]
    return v ?? ''
  }

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      const payload = { ...form }
      payload.salary_details.minimum_salary = Number(payload.salary_details.minimum_salary) || null
      payload.salary_details.maximum_salary = Number(payload.salary_details.maximum_salary) || null
      payload.candidate_profile.age_range.min = Number(payload.candidate_profile.age_range.min) || null
      payload.candidate_profile.age_range.max = Number(payload.candidate_profile.age_range.max) || null
      payload.experience_requirement.work_experience_years.min = Number(payload.experience_requirement.work_experience_years.min) || null
      payload.experience_requirement.work_experience_years.max = Number(payload.experience_requirement.work_experience_years.max) || null
      payload.experience_requirement.gcc_experience_years.min = Number(payload.experience_requirement.gcc_experience_years.min) || null
      payload.experience_requirement.gcc_experience_years.max = Number(payload.experience_requirement.gcc_experience_years.max) || null
      fd.append('payload', JSON.stringify(payload))
      await api.createJob(fd)
      nav('/dashboard')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  // ── Step renderers ─────────────────────────────────────────────────────────
  const Step1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card">
        <div className="section-hd"><h3>01</h3><h2>Employer Details</h2></div>
        <div className="form-row" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Company Type</label>
            <select className="form-select" value={F('employer_details.type_of_company')} onChange={e => set('employer_details.type_of_company', e.target.value)}>
              <option value="">Select type</option>
              {ref?.company_types?.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input className="form-input" value={F('employer_details.company_name')} onChange={e => set('employer_details.company_name', e.target.value)} placeholder="e.g. TalentBridge Global" />
          </div>
        </div>
        <div className="form-row mt-3" style={{ gap: 16, alignItems: 'center' }}>
          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input className="form-input" type="date" value={F('employer_details.expiry_date') || ''} onChange={e => set('employer_details.expiry_date', e.target.value || null)} />
          </div>
          <div className="form-group">
            <label className="form-label">Publish Job</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
              <input type="checkbox" checked={form.employer_details.publish_this_job} onChange={e => set('employer_details.publish_this_job', e.target.checked)} />
              <span className="text-sm">Make this job publicly visible</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-hd"><h3>02</h3><h2>Job Details</h2></div>
        <div className="form-group mb-4">
          <label className="form-label">Job Title <span style={{ color: 'var(--error)' }}>*</span></label>
          <input className="form-input" value={F('job_details.job_title')} onChange={e => set('job_details.job_title', e.target.value)} placeholder="e.g. Senior Software Engineer" />
        </div>
        <div className="form-row mb-4" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Job Type</label>
            <select className="form-select" value={F('job_details.job_type')} onChange={e => set('job_details.job_type', e.target.value)}>
              <option value="">Select</option>
              {ref?.job_types?.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Work Mode</label>
            <select className="form-select" value={F('job_details.job_location_type')} onChange={e => set('job_details.job_location_type', e.target.value)}>
              <option value="">Select</option>
              {ref?.job_locations?.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row mb-4" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Industry</label>
            <select className="form-select" value={F('job_details.industry')} onChange={e => set('job_details.industry', e.target.value)}>
              <option value="">Select</option>
              {ref?.industries?.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Functional Area</label>
            <select className="form-select" value={F('job_details.functional_area')} onChange={e => set('job_details.functional_area', e.target.value)}>
              <option value="">Select</option>
              {ref?.functional_areas?.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <select className="form-select" value={F('job_details.designation')} onChange={e => set('job_details.designation', e.target.value)}>
              <option value="">Select</option>
              {ref?.designations?.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group mb-4">
          <label className="form-label">Roles & Responsibilities</label>
          <textarea className="form-textarea" rows={5} value={F('job_details.roles_and_responsibilities')} onChange={e => set('job_details.roles_and_responsibilities', e.target.value)} placeholder="Describe key responsibilities of this role..." />
        </div>
        <div className="form-group mb-4">
          <label className="form-label">Desired Candidate Profile</label>
          <textarea className="form-textarea" rows={4} value={F('job_details.desired_candidate_profile')} onChange={e => set('job_details.desired_candidate_profile', e.target.value)} placeholder="Describe the ideal candidate..." />
        </div>
        <div className="form-row mb-4" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Country</label>
            <select className="form-select" value={F('job_details.country')} onChange={e => { set('job_details.country', e.target.value); set('job_details.state', ''); set('job_details.city', '') }}>
              <option value="">Select</option>
              {ref?.countries?.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <select className="form-select" value={F('job_details.state')} onChange={e => { set('job_details.state', e.target.value); set('job_details.city', '') }}>
              <option value="">Select</option>
              {F('job_details.country') && ref?.location_hierarchy?.[F('job_details.country')]
                ? Object.keys(ref.location_hierarchy[F('job_details.country')]).map(s => <option key={s}>{s}</option>)
                : ref?.states?.map(s => <option key={s}>{s}</option>)
              }
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <select className="form-select" value={F('job_details.city')} onChange={e => set('job_details.city', e.target.value)}>
              <option value="">Select</option>
              {F('job_details.country') && F('job_details.state') && ref?.location_hierarchy?.[F('job_details.country')]?.[F('job_details.state')]
                ? ref.location_hierarchy[F('job_details.country')][F('job_details.state')].map(c => <option key={c}>{c}</option>)
                : ref?.cities?.map(c => <option key={c}>{c}</option>)
              }
            </select>
          </div>
        </div>
        <div className="form-row" style={{ gap: 16 }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Keywords</label>
            <TagInput value={form.job_details.keywords} onChange={v => set('job_details.keywords', v)} placeholder="Add keywords..." />
          </div>
          <div className="form-group">
            <label className="form-label">Vacancies</label>
            <input className="form-input" type="number" min={1} value={F('job_details.number_of_vacancies')} onChange={e => set('job_details.number_of_vacancies', Number(e.target.value))} />
          </div>
        </div>
      </div>
    </div>
  )

  const Step2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card">
        <div className="section-hd"><h3>03</h3><h2>Salary</h2></div>
        <div className="form-row" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="form-select" value={F('salary_details.currency')} onChange={e => set('salary_details.currency', e.target.value)}>
              {ref?.currencies?.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Min Salary</label>
            <input className="form-input" type="number" value={F('salary_details.minimum_salary')} onChange={e => set('salary_details.minimum_salary', e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Max Salary</label>
            <input className="form-input" type="number" value={F('salary_details.maximum_salary')} onChange={e => set('salary_details.maximum_salary', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="form-group mt-3">
          <label className="form-label">Other Benefits</label>
          <input className="form-input" value={F('salary_details.other_benefits')} onChange={e => set('salary_details.other_benefits', e.target.value)} placeholder="Health insurance, visa, annual flight..." />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 12 }}>
          <input type="checkbox" checked={form.salary_details.hide_salary_from_job_seekers} onChange={e => set('salary_details.hide_salary_from_job_seekers', e.target.checked)} />
          <span className="text-sm">Hide salary from candidates</span>
        </label>
      </div>

      <div className="card">
        <div className="section-hd"><h3>04</h3><h2>Candidate Profile</h2></div>
        <div className="form-row mb-4" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-select" value={F('candidate_profile.gender')} onChange={e => set('candidate_profile.gender', e.target.value)}>
              <option value="">Any</option>
              {['Male', 'Female', 'Any'].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nationality</label>
            <select className="form-select" value={F('candidate_profile.nationality')} onChange={e => set('candidate_profile.nationality', e.target.value)}>
              <option value="">Any</option>
              {ref?.nationalities?.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Visa Status</label>
            <select className="form-select" value={F('candidate_profile.visa_status')} onChange={e => set('candidate_profile.visa_status', e.target.value)}>
              <option value="">Any</option>
              {ref?.visa_statuses?.map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row mb-4" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Age Min</label>
            <input className="form-input" type="number" value={F('candidate_profile.age_range.min')} onChange={e => set('candidate_profile.age_range.min', e.target.value)} placeholder="18" />
          </div>
          <div className="form-group">
            <label className="form-label">Age Max</label>
            <input className="form-input" type="number" value={F('candidate_profile.age_range.max')} onChange={e => set('candidate_profile.age_range.max', e.target.value)} placeholder="60" />
          </div>
          <div className="form-group">
            <label className="form-label">Availability</label>
            <select className="form-select" value={F('candidate_profile.availability')} onChange={e => set('candidate_profile.availability', e.target.value)}>
              <option value="">Any</option>
              {ref?.availability_options?.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Languages Known</label>
          <TagInput value={form.candidate_profile.languages_known} onChange={v => set('candidate_profile.languages_known', v)} suggestions={ref?.languages || []} placeholder="Add language..." />
        </div>
      </div>
    </div>
  )

  const Step3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card">
        <div className="section-hd"><h3>05</h3><h2>Skills</h2></div>
        <div className="form-group mb-4">
          <label className="form-label">Functional Skills</label>
          <TagInput value={form.skills_requirement.functional_skills} onChange={v => set('skills_requirement.functional_skills', v)} suggestions={ref?.functional_skills || []} placeholder="Add functional skill..." />
        </div>
        <div className="form-group mb-4">
          <label className="form-label">Professional Skills</label>
          <TagInput value={form.skills_requirement.professional_skills} onChange={v => set('skills_requirement.professional_skills', v)} suggestions={ref?.professional_skills || []} placeholder="Add professional skill..." />
        </div>
        <div className="form-group">
          <label className="form-label">IT Skills</label>
          <TagInput value={form.skills_requirement.it_skills} onChange={v => set('skills_requirement.it_skills', v)} suggestions={ref?.it_skills || []} placeholder="Add IT skill..." />
        </div>
      </div>

      <div className="card">
        <div className="section-hd"><h3>06</h3><h2>Experience</h2></div>
        <div className="form-row" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">General Exp — Min (yrs)</label>
            <input className="form-input" type="number" min={0} value={F('experience_requirement.work_experience_years.min')} onChange={e => set('experience_requirement.work_experience_years.min', e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">General Exp — Max (yrs)</label>
            <input className="form-input" type="number" min={0} value={F('experience_requirement.work_experience_years.max')} onChange={e => set('experience_requirement.work_experience_years.max', e.target.value)} placeholder="10" />
          </div>
          <div className="form-group">
            <label className="form-label">GCC Exp — Min (yrs)</label>
            <input className="form-input" type="number" min={0} value={F('experience_requirement.gcc_experience_years.min')} onChange={e => set('experience_requirement.gcc_experience_years.min', e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">GCC Exp — Max (yrs)</label>
            <input className="form-input" type="number" min={0} value={F('experience_requirement.gcc_experience_years.max')} onChange={e => set('experience_requirement.gcc_experience_years.max', e.target.value)} placeholder="5" />
          </div>
        </div>
      </div>
    </div>
  )

  const Step4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card">
        <div className="section-hd"><h3>07</h3><h2>Application Settings</h2></div>
        <div className="form-group mb-4">
          <label className="form-label">Application Mode</label>
          <select className="form-select" value={F('application_mode')} onChange={e => set('application_mode', e.target.value)}>
            <option value="">Select</option>
            {ref?.application_modes?.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group mb-4">
          <label className="form-label">Recruiter Instructions</label>
          <textarea className="form-textarea" rows={4} value={F('recruiter_instructions')} onChange={e => set('recruiter_instructions', e.target.value)} placeholder="Any special instructions for the AI assessment generator..." />
        </div>
        <div className="form-group">
          <label className="form-label">Custom Screening Questions</label>
          <TagInput value={form.custom_questions} onChange={v => set('custom_questions', v)} placeholder='Type question, press Enter...' />
          <span className="form-hint mt-1">Max 6 questions</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
    </div>
  )

  const stepComponents = [<Step1 />, <Step2 />, <Step3 />, <Step4 />]

  return (
    <Layout title="Post a Job" actions={
      <button className="btn btn-ghost btn-sm" onClick={() => nav('/dashboard')}>← Back</button>
    }>
      <Steps current={step} steps={STEPS} />
      {stepComponents[step]}
      <div className="wizard-actions">
        <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(s => s - 1) : nav('/dashboard')} disabled={saving}>
          {step === 0 ? 'Cancel' : '← Previous'}
        </button>
        {step < STEPS.length - 1
          ? <button className="btn btn-primary" onClick={() => {
              if (step === 0 && !form.job_details.job_title.trim()) { setError('Job title is required.'); return }
              setError(''); setStep(s => s + 1)
            }}>Next →</button>
          : <button id="btn-submit-job" className={`btn btn-primary${saving ? ' btn-loading' : ''}`} onClick={submit} disabled={saving}>
              {saving ? <><span className="spinner" /> Posting…</> : 'Post Job'}
            </button>
        }
      </div>
    </Layout>
  )
}
