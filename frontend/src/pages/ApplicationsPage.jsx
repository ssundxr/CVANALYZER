import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api/client'

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ReportModal({ application, job, onClose }) {
  if (!application || !application.assessment_attempt) return null
  const { assessment_attempt: attempt } = application
  const { score_details, answers, warnings_count } = attempt
  
  // Flatten all questions from all sections for matching
  const allQuestions = job.assessment_config?.generated_assessment?.sections?.flatMap(s => s.questions) || []

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content card" style={{ width: '900px', maxHeight: '90vh', overflowY: 'auto', padding: 0, border: '1px solid var(--border)' }}>
        <div className="card-header" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: 20 }}>Assessment Report: {application.candidate?.display_name}</h2>
            <div className="text-muted text-sm mt-1">Application ID: #{application.id} • Completed: {fmt(attempt.completed_at)}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        <div style={{ padding: '30px' }}>
          <div className="stats-grid mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="card stat-card" style={{ borderColor: 'var(--primary)' }}>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>{score_details?.percentage}%</div>
              <div className="stat-label">Overall Score</div>
            </div>
            <div className="card stat-card" style={{ borderColor: warnings_count > 0 ? 'var(--error)' : 'var(--border)' }}>
              <div className="stat-value" style={{ color: warnings_count > 0 ? 'var(--error)' : 'var(--text)' }}>{warnings_count} / 3</div>
              <div className="stat-label">Proctoring Violations</div>
            </div>
            <div className="card stat-card">
              <div className="stat-value">{allQuestions.length}</div>
              <div className="stat-label">Questions Evaluated</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: 16, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Question-by-Question Breakdown</h3>
            
            {allQuestions.map((q, idx) => {
              const result = score_details?.questions?.[q.id]
              const candidateAns = answers[q.id]
              const isCorrect = (result?.score || 0) >= 0.7

              return (
                <div key={q.id} className="card" style={{ padding: '20px', borderLeft: `4px solid ${isCorrect ? 'var(--success)' : (result?.score > 0 ? 'var(--warning)' : 'var(--error)')}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className="mono text-muted text-xs">QUESTION {idx + 1}</span>
                    <span className={`badge ${isCorrect ? 'badge-published' : 'badge-draft'}`} style={{ fontSize: '10px' }}>
                      SCORE: {Math.round((result?.score || 0) * 100)}%
                    </span>
                  </div>
                  
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: '16px' }}>{q.question}</div>
                  
                  <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <div className="text-xs text-muted mb-1 uppercase font-bold">Candidate's Answer</div>
                      <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '4px', fontSize: '14px', minHeight: '60px' }}>
                        {candidateAns || <em className="text-muted">No answer provided</em>}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-1 uppercase font-bold">Model Answer / Reference</div>
                      <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '4px', fontSize: '14px', minHeight: '60px' }}>
                        {q.correct_answer || "Contextual AI Evaluation"}
                      </div>
                    </div>
                  </div>

                  {result?.reason && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)', fontSize: '13px' }}>
                      <span className="text-primary font-bold">AI Feedback:</span> {result.reason}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="card-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-primary" onClick={onClose}>Done Reviewing</button>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  
  const [applications, setApplications] = useState([])
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)

  useEffect(() => {
    Promise.all([
      api.getJob(jobId),
      api.getJobApplications(jobId)
    ])
    .then(([jRes, aRes]) => {
      setJob(jRes.job)
      setApplications(aRes.items || [])
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false))
  }, [jobId])

  const handleSendAssessment = async (appId) => {
    try {
      await api.sendAssessment(appId)
      const res = await api.getJobApplications(jobId)
      setApplications(res.items || [])
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <Layout
      title={`Applications`}
      actions={
        <button className="btn btn-ghost" onClick={() => navigate('/admin/dashboard')}>
          Back to Dashboard
        </button>
      }
    >
      {error && <div className="alert alert-error mb-4">{error}</div>}
      
      {job && (
        <div className="card mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>{job.job_details?.job_title}</h2>
            <p className="text-muted text-sm mono">Job No: {job.job_number} • {applications.length} Applicants</p>
          </div>
          <span className={`badge ${job.status === 'published' ? 'badge-published' : 'badge-draft'}`}>
            {job.status}
          </span>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <h2>No applications yet</h2>
            <p>Wait for candidates to find your job on the portal.</p>
          </div>
        ) : (
          <div style={{ padding: '20px', display: 'flex', gap: '24px' }}>
            {/* Mocked Left Sidebar for Filters matching the screenshot */}
            <div style={{ width: '250px', flexShrink: 0, paddingRight: '20px', borderRight: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, color: 'var(--text)', marginBottom: 16, textTransform: 'none' }}>Refine Search</h3>
              <div className="form-group">
                <input className="form-input text-sm" placeholder="Search keywords..." />
              </div>
              <div className="text-sm font-bold mt-6 mb-3 uppercase text-muted">Status</div>
              <div className="text-sm font-bold mt-4 mb-3 uppercase text-muted">Score Range</div>
              <div className="text-sm font-bold mt-4 mb-3 uppercase text-muted">Proctor Status</div>
            </div>

            {/* Applicant Cards List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm text-muted">{applications.length} Applicant(s)</span>
              </div>
              
              {applications.map(app => (
                <div key={app.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px', display: 'flex', gap: '16px' }}>
                    <input type="checkbox" style={{ marginTop: '4px' }} />
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-muted text-sm mono">#{app.id}</span>
                        <span className={`badge ${app.status === 'assessment_completed' ? 'badge-published' : 'badge-active'}`}>
                          {app.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                        {app.candidate?.display_name || 'Candidate'}
                      </div>
                      
                      <div className="grid mt-4" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                        <div>
                          <div className="text-xs text-muted mb-1 flex items-center gap-1">Email Content</div>
                          <div className="text-sm font-bold" style={{ wordBreak: 'break-all' }}>{app.candidate?.email}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted mb-1 relative">Assessment Score</div>
                          <div className="text-sm font-bold">
                            {app.assessment_attempt?.score_details ? `${app.assessment_attempt.score_details.percentage}%` : 'Pending'}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs text-muted mb-1">Applied On</div>
                          <div className="text-sm font-bold">{fmt(app.created_at)}</div>
                        </div>
                        <div className="mt-2">
                          <div className="text-xs text-muted mb-1">Proctor Check</div>
                          <div className="text-sm font-bold text-error">
                            {app.assessment_attempt ? `${app.assessment_attempt.warnings_count} Violations` : 'Pending'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: 'var(--bg)', padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                      {app.status === 'applied' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleSendAssessment(app.id)}>
                          Dispatch Assessment
                        </button>
                      )}
                      {app.status === 'assessment_sent' && (
                        <button className="btn btn-ghost btn-sm disabled" disabled>Assessment In Progress</button>
                      )}
                      {app.status === 'assessment_completed' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => window.open(`/admin/report/${app.id}`, '_blank')}>
                          View Detailed Report
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
