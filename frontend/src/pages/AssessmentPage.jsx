import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api/client'

const GOALS = [
  { key: 'preliminary_screening', label: 'Preliminary Screening', desc: 'Basic fit check before shortlisting' },
  { key: 'skills_validation', label: 'Skills Validation', desc: 'Verify specific technical or functional skills' },
  { key: 'job_eligibility_review', label: 'Job Eligibility Review', desc: 'Confirm candidate meets job criteria' },
  { key: 'pre_interview_case_study', label: 'Pre-Interview / Case Study', desc: 'In-depth analysis before the interview' },
]

const DIFFICULTIES = ['Basic', 'Intermediate', 'Advanced']

const COMPETENCIES = [
  { key: 'functional_role_specific', label: 'Functional / Role-Specific Skills' },
  { key: 'problem_solving', label: 'Problem Solving & Cognitive' },
  { key: 'role_based_knowledge', label: 'Role-Based Knowledge' },
  { key: 'leadership_decision_making', label: 'Leadership & Decision Making' },
  { key: 'compliance_industry_knowledge', label: 'Compliance & Industry Knowledge' },
  { key: 'cultural_fit', label: 'Cultural Fit' },
]

const KNOWLEDGE_SOURCES = [
  { key: 'job_title', label: 'Job Title' },
  { key: 'industry', label: 'Industry' },
  { key: 'functional_area', label: 'Functional Area' },
  { key: 'roles_responsibilities', label: 'Roles & Responsibilities' },
  { key: 'desired_candidate_profile', label: 'Desired Candidate Profile' },
  { key: 'functional_skills', label: 'Functional Skills' },
  { key: 'professional_skills', label: 'Professional Skills' },
  { key: 'it_skills', label: 'IT Skills' },
  { key: 'experience_general', label: 'Experience (General)' },
  { key: 'experience_gcc', label: 'Experience (GCC)' },
]

const DEFAULT_QUESTION_PLAN = [
  { key: 'mcq', label: 'MCQ', count: 10, minutes_per_question: 2, weight: 30 },
  { key: 'yes_no', label: 'Yes / No', count: 5, minutes_per_question: 1, weight: 10 },
  { key: 'descriptive', label: 'Descriptive', count: 4, minutes_per_question: 5, weight: 40 },
  { key: 'case_study', label: 'Case Study', count: 3, minutes_per_question: 15, weight: 20 },
]

function toggle(arr, key) {
  return arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key]
}

export default function AssessmentPage() {
  const { jobId } = useParams()
  const nav = useNavigate()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [savingGenerated, setSavingGenerated] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [result, setResult] = useState(null)
  const [assessmentDraft, setAssessmentDraft] = useState(null)

  const [config, setConfig] = useState({
    assessment_name: '',
    knowledge_sources: KNOWLEDGE_SOURCES.map(k => k.key),
    goals: ['skills_validation'],
    difficulty: 'Intermediate',
    competencies: ['functional_role_specific', 'problem_solving'],
    delivery_rules: ['random_mix'],
    question_plan: DEFAULT_QUESTION_PLAN,
    recruiter_instructions: '',
    screening_fields: [],
  })

  useEffect(() => {
    api.getJob(jobId)
      .then(d => {
        setJob(d.job)
        const cfg = d.job.assessment_config
        if (cfg && cfg.goals?.length > 0) {
          setConfig(prev => ({
            ...prev,
            ...cfg,
            question_plan: cfg.question_plan?.length > 0 ? cfg.question_plan : DEFAULT_QUESTION_PLAN,
            recruiter_instructions: d.job.recruiter_instructions || '',
          }))
          if (cfg.generated_assessment) {
            setAssessmentDraft(cfg.generated_assessment)
            setResult({
              model: cfg.generated_model || 'saved',
              generated_assessment: cfg.generated_assessment,
              generated_at: cfg.generated_at,
            })
          }
        } else {
          setConfig(prev => ({ ...prev, recruiter_instructions: d.job.recruiter_instructions || '' }))
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [jobId])

  function updatePlan(index, field, value) {
    setConfig(prev => {
      const plan = [...prev.question_plan]
      plan[index] = { ...plan[index], [field]: Number(value) }
      return { ...prev, question_plan: plan }
    })
  }

  const totalQ = config.question_plan.reduce((s, i) => s + i.count, 0)
  const totalMin = config.question_plan.reduce((s, i) => s + i.count * i.minutes_per_question, 0)
  const totalWt = config.question_plan.reduce((s, i) => s + i.weight, 0)

  async function saveConfig() {
    setSaving(true); setError(''); setSuccess('')
    try {
      await api.updateAssessment(jobId, config)
      setSuccess('Assessment configuration saved.')
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  async function generate() {
    setGenerating(true); setError(''); setSuccess(''); setResult(null)
    try {
      await api.updateAssessment(jobId, config)
      const res = await api.generateAssessment(jobId)
      setResult(res)
      setAssessmentDraft(res.generated_assessment)
      setSuccess('Assessment generated. You can edit and save it below.')
    } catch (e) { setError(e.message) } finally { setGenerating(false) }
  }

  function updateGenerated(path, value) {
    setAssessmentDraft(prev => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev))
      let target = next
      for (let i = 0; i < path.length - 1; i++) target = target[path[i]]
      target[path[path.length - 1]] = value
      return next
    })
  }

  function removeQuestion(sectionIndex, questionIndex) {
    setAssessmentDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next.sections[sectionIndex].questions.splice(questionIndex, 1)
      return next
    })
  }

  function addQuestion(sectionIndex) {
    setAssessmentDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const section = next.sections[sectionIndex]
      const isOptionType = section.type === 'mcq' || section.type === 'yes_no'
      section.questions.push({
        id: section.questions.length + 1,
        question: '',
        competency: '',
        difficulty: 'Intermediate',
        time_minutes: 2,
        ...(isOptionType ? { options: ['A. ', 'B. ', 'C. ', 'D. '], correct_answer: 'A' } : { model_answer: '' }),
      })
      return next
    })
  }

  function addSection() {
    setAssessmentDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}))
      const sections = Array.isArray(next.sections) ? next.sections : []
      sections.push({
        type: 'mcq',
        label: `New Section ${sections.length + 1}`,
        weight_percent: 0,
        questions: [],
      })
      next.sections = sections
      return next
    })
  }

  function removeSection(sectionIndex) {
    setAssessmentDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next.sections.splice(sectionIndex, 1)
      return next
    })
  }

  async function saveGeneratedAssessment() {
    if (!assessmentDraft) return
    setSavingGenerated(true)
    setError('')
    setSuccess('')
    try {
      const totalQuestions = (assessmentDraft.sections || []).reduce((sum, sec) => sum + (sec.questions?.length || 0), 0)
      const estimatedMinutes = (assessmentDraft.sections || []).reduce(
        (sum, sec) => sum + (sec.questions || []).reduce((s, q) => s + (Number(q.time_minutes) || 0), 0),
        0
      )

      const payload = {
        ...config,
        generated_assessment: {
          ...assessmentDraft,
          total_questions: totalQuestions,
          estimated_duration_minutes: estimatedMinutes,
        },
        generated_model: result?.model || config.generated_model || 'gemini',
        generated_at: new Date().toISOString(),
      }
      await api.updateAssessment(jobId, payload)
      setSuccess('Generated assessment saved successfully.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingGenerated(false)
    }
  }

  if (loading) return (
    <Layout title="Assessment Builder">
      <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
    </Layout>
  )

  const jobTitle = job?.job_details?.job_title || `Job #${jobId}`

  return (
    <Layout
      title="Assessment Builder"
      actions={<button className="btn btn-ghost btn-sm" onClick={() => nav('/dashboard')}>← Dashboard</button>}
    >
      {/* Job context bar */}
      <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 20px' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Configuring assessment for</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{jobTitle}</div>
        </div>
        <span style={{ flex: 1 }} />
        <span className="mono text-muted text-sm">{job?.assessment_number}</span>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ── Section 1: Knowledge Sources ─────────────────────────────── */}
        <div className="card" style={{ height: '100%' }}>
          <div className="section-hd">
            <h3>Module 01</h3>
            <h2>Job Post Knowledge Base</h2>
          </div>
          <p className="text-sm text-muted mb-4">Select which job data the AI should use when drafting questions.</p>
          <div className="chips-wrap">
            {KNOWLEDGE_SOURCES.map(src => (
              <div
                key={src.key}
                className={`chip ${config.knowledge_sources.includes(src.key) ? 'active' : ''}`}
                onClick={() => setConfig(prev => ({ ...prev, knowledge_sources: toggle(prev.knowledge_sources, src.key) }))}
              >
                {src.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 2: Assessment Goals ───────────────────────────────── */}
        <div className="card" style={{ height: '100%' }}>
          <div className="section-hd">
            <h3>Module 02</h3>
            <h2>Assessment Objective</h2>
          </div>
          <p className="text-sm text-muted mb-4">What is the core purpose of this assessment pipeline?</p>
          <div className="goal-grid" style={{ gridTemplateColumns: '1fr' }}>
            {GOALS.map(g => (
              <div
                key={g.key}
                className={`goal-tile ${config.goals.includes(g.key) ? 'active' : ''}`}
                onClick={() => setConfig(prev => ({ ...prev, goals: toggle(prev.goals, g.key) }))}
                style={{ padding: '16px' }}
              >
                <div className="g-title">{g.label}</div>
                <div className="g-desc">{g.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 4: Competencies ───────────────────────────────────── */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-hd">
            <h3>Module 03</h3>
            <h2>Competency Matrix</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <p className="text-sm text-muted">Select the specific psychological or technical vectors to measure.</p>
            <div className="diff-selector">
              {DIFFICULTIES.map(d => (
                <div
                  key={d}
                  className={`diff-opt ${config.difficulty === d ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, difficulty: d }))}
                >{d}</div>
              ))}
            </div>
          </div>
          <div className="competency-grid">
            {COMPETENCIES.map(c => (
              <div
                key={c.key}
                className={`comp-card ${config.competencies.includes(c.key) ? 'active' : ''}`}
                onClick={() => setConfig(prev => ({ ...prev, competencies: toggle(prev.competencies, c.key) }))}
              >
                <div className="comp-label font-bold" style={{ fontSize: 13, color: config.competencies.includes(c.key) ? 'var(--primary)' : 'var(--text)' }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Question Blueprint ────────────────────────────────────────── */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-hd">
            <h3>Module 04</h3>
            <h2>Architecture Blueprint</h2>
          </div>
          <div className="table-wrap">
            <table className="blueprint-table table-borderless">
              <thead>
                <tr>
                  <th style={{ background: 'transparent' }}>Question Format</th>
                  <th style={{ background: 'transparent', textAlign: 'center' }}>Total Output</th>
                  <th style={{ background: 'transparent', textAlign: 'center' }}>Min / Question</th>
                  <th style={{ background: 'transparent', textAlign: 'center' }}>Extrapolated Duration</th>
                  <th style={{ background: 'transparent', textAlign: 'center' }}>Scoring Weightage</th>
                </tr>
              </thead>
              <tbody>
                {config.question_plan.map((item, i) => (
                  <tr key={item.key}>
                    <td style={{ verticalAlign: 'middle', fontSize: 14 }}><strong>{item.label}</strong></td>
                    <td align="center">
                      <input className="form-input" style={{ width: 60 }} type="number" min={0} max={50} value={item.count}
                        onChange={e => updatePlan(i, 'count', e.target.value)} />
                    </td>
                    <td align="center">
                      <input className="form-input" style={{ width: 60 }} type="number" min={0.5} step={0.5} value={item.minutes_per_question}
                        onChange={e => updatePlan(i, 'minutes_per_question', e.target.value)} />
                    </td>
                    <td align="center" className="text-muted" style={{ verticalAlign: 'middle' }}>{(item.count * item.minutes_per_question).toFixed(1)}m</td>
                    <td align="center">
                      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                         <input className="form-input" style={{ width: 60, paddingRight: 4, marginRight: 4 }} type="number" min={0} max={100} value={item.weight}
                           onChange={e => updatePlan(i, 'weight', e.target.value)} /> <span className="text-muted text-sm">%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="totals-row" style={{ background: 'var(--surface-hover)', fontWeight: 600 }}>
                  <td style={{ padding: '12px 16px' }}>AGGREGATE LIMITS</td>
                  <td align="center">{totalQ} Items</td>
                  <td align="center">—</td>
                  <td align="center">{totalMin.toFixed(1)} min</td>
                  <td align="center" style={{ color: totalWt !== 100 ? 'var(--error)' : 'var(--success)' }}>
                    {totalWt}% {totalWt !== 100 && <span className="text-xs ml-1" title="Weight must equal 100%">⚠</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Assessment name + recruiter instructions ──────────────────── */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-hd"><h3>Final Parameters</h3><h2>Naming & Directives</h2></div>
          <div className="flex gap-4">
              <div className="form-group w-full">
                <label className="form-label">Client-Facing Name</label>
                <input className="form-input" style={{ fontSize: 16, padding: '14px 16px' }} value={config.assessment_name} onChange={e => setConfig(prev => ({ ...prev, assessment_name: e.target.value }))} placeholder={`${jobTitle} Assessment`} />
              </div>
              <div className="form-group w-full">
                <label className="form-label">LLM Context Instructions</label>
                <textarea className="form-input" rows={1} style={{ fontSize: 14, minHeight: 52 }} value={config.recruiter_instructions} onChange={e => setConfig(prev => ({ ...prev, recruiter_instructions: e.target.value }))} placeholder="Any special focus areas, tone, or constraints for the AI..." />
              </div>
          </div>
        </div>
      </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button id="btn-save-assessment" className={`btn btn-ghost${saving ? ' btn-loading' : ''}`} onClick={saveConfig} disabled={saving || generating}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Save Config'}
          </button>
          <button id="btn-generate-assessment" className={`btn btn-primary${generating ? ' btn-loading' : ''}`} onClick={generate} disabled={saving || generating}>
            {generating ? <><span className="spinner" /> Generating…</> : '✦ Generate with Gemini'}
          </button>
        </div>

        {/* ── Gemini result ─────────────────────────────────────────────── */}
        {(result || assessmentDraft) && (
          <div className="result-panel">
            <div className="result-panel-header">
              <strong>Generated Assessment Studio</strong>
              <span>Model: {result?.model || config.generated_model || 'saved'}</span>
            </div>

            <div className="result-code" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

              {(assessmentDraft?.sections || []).map((section, si) => (
                <div key={si} className="assessment-section-card">
                  <div className="assessment-section-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <input className="assessment-studio-input" style={{ flex: 1, fontSize: 22 }} placeholder="Section Identity" value={section.label || ''} onChange={e => updateGenerated(['sections', si, 'label'], e.target.value)} />
                      <select className="form-input" style={{ width: 140, fontWeight: 600, background: 'var(--bg)', borderColor: 'transparent' }} value={section.type || 'mcq'} onChange={e => updateGenerated(['sections', si, 'type'], e.target.value)}>
                        <option value="mcq">Auto-Grade MCQ</option>
                        <option value="yes_no">Binary Yes/No</option>
                        <option value="descriptive">AI Descriptive</option>
                        <option value="case_study">Case Study</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted uppercase">Weight</span>
                        <input className="form-input" style={{ width: 80, textAlign: 'center' }} type="number" min={0} max={100} value={section.weight_percent || 0} onChange={e => updateGenerated(['sections', si, 'weight_percent'], Number(e.target.value))} />
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)', borderColor: 'transparent' }} onClick={() => removeSection(si)}>✖</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {(section.questions || []).map((q, qi) => {
                      const type = section.type || 'mcq'
                      return (
                        <div className="assessment-q-card" key={qi}>
                          <div className="assessment-q-meta justify-between">
                            <div className="flex gap-2 items-center">
                               <span className="badge badge-published" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>ITEM {q.id || qi + 1}</span>
                               <input className="form-input" style={{ width: 140, padding: 4, height: 26, fontSize: 11 }} placeholder="Competency Tag" value={q.competency || ''} onChange={e => updateGenerated(['sections', si, 'questions', qi, 'competency'], e.target.value)} />
                            </div>
                            <div className="flex gap-2 items-center">
                               <select className="form-input" style={{ width: 120, padding: 4, height: 26, fontSize: 11 }} value={q.difficulty || 'Intermediate'} onChange={e => updateGenerated(['sections', si, 'questions', qi, 'difficulty'], e.target.value)}>
                                 {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                               </select>
                               <span className="text-xs text-muted">Minutes:</span>
                               <input className="form-input" style={{ width: 60, padding: 4, height: 26, fontSize: 11 }} type="number" min={1} value={q.time_minutes || 1} onChange={e => updateGenerated(['sections', si, 'questions', qi, 'time_minutes'], Number(e.target.value))} />
                             </div>
                          </div>

                          <textarea className="form-input" style={{ fontSize: 16, border: '1px solid transparent', background: 'white', minHeight: 80, fontWeight: 500 }} rows={2} value={q.question || ''} onChange={e => updateGenerated(['sections', si, 'questions', qi, 'question'], e.target.value)} placeholder="Type prompt here..." />

                          {(type === 'mcq' || type === 'yes_no') && (
                            <div className="grid gap-4 mt-2" style={{ gridTemplateColumns: '1fr 120px' }}>
                              <textarea
                                className="form-input"
                                rows={4}
                                style={{ fontSize: 13, fontFamily: 'monospace' }}
                                value={(q.options || []).join('\n')}
                                onChange={e => updateGenerated(['sections', si, 'questions', qi, 'options'], e.target.value.split('\n').map(v => v.trim()).filter(Boolean))}
                                placeholder="A. Option 1&#10;B. Option 2&#10;C. Option 3"
                              />
                              <div>
                                <label className="text-xs font-bold text-muted uppercase">Correct</label>
                                <input className="form-input mt-1" style={{ textAlign: 'center', fontSize: 18, fontWeight: 700 }} value={q.correct_answer || ''} onChange={e => updateGenerated(['sections', si, 'questions', qi, 'correct_answer'], e.target.value)} placeholder="A" />
                              </div>
                            </div>
                          )}

                          {(type === 'descriptive' || type === 'case_study') && (
                            <textarea className="form-input mt-2" style={{ fontSize: 13, background: 'rgba(16,157,184,0.05)', borderColor: 'rgba(16,157,184,0.2)' }} rows={3} value={q.model_answer || ''} onChange={e => updateGenerated(['sections', si, 'questions', qi, 'model_answer'], e.target.value)} placeholder="Baseline AI Model Answer / Context..." />
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={() => removeQuestion(si, qi)}>Remove Line</button>
                          </div>
                        </div>
                      )
                    })}
                    <button className="btn btn-ghost" style={{ borderStyle: 'dashed', marginTop: 8 }} onClick={() => addQuestion(si)}>+ Attach Form Node</button>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <button className="btn btn-ghost" onClick={addSection}>+ Add Section</button>
                <button className={`btn btn-primary${savingGenerated ? ' btn-loading' : ''}`} onClick={saveGeneratedAssessment} disabled={savingGenerated}>
                  {savingGenerated ? <><span className="spinner" /> Saving…</> : 'Save Generated Assessment'}
                </button>
              </div>
            </div>
          </div>
        )}

    </Layout>
  )
}
