import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../api/client'

function StatusBadge({ status }) {
  const cls = status === 'published' ? 'badge-published' : status === 'draft' ? 'badge-draft' : 'badge-active'
  return <span className={`badge ${cls}`}>{status}</span>
}

function fmt(dt) {
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState([])
  const [recentCodes, setRecentCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [codesLoading, setCodesLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchJobs()
    fetchCodes()
  }, [])

  const fetchJobs = () => {
    api.listJobs()
      .then(d => setJobs(d.items || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  const fetchCodes = () => {
    api.getRecentProctorCodes()
      .then(d => setRecentCodes(d.items || []))
      .catch(e => console.error("Failed to fetch codes:", e))
      .finally(() => setCodesLoading(false))
  }

  const togglePublish = async (jobId, currentStatus) => {
    const newStatus = currentStatus === 'published' ? 'unpublished' : 'published'
    try {
      await api.toggleJobStatus(jobId, newStatus)
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
    } catch (e) {
      alert(`Failed to update status: ${e.message}`)
    }
  }

  const total = jobs.length
  const published = jobs.filter(j => j.status === 'published').length
  const draft = jobs.filter(j => j.status === 'draft').length
  const withAssessment = jobs.filter(j => j.assessment_config?.goals?.length > 0).length

  return (
    <Layout
      title="Dashboard"
      actions={
        <button id="btn-post-job" className="btn btn-primary" onClick={() => navigate('/admin/post-job')}>
          + Post a Job
        </button>
      }
    >
      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="stats-grid">
        {[
          { label: 'Total Jobs', value: total },
          { label: 'Published', value: published },
          { label: 'Draft', value: draft },
          { label: 'Assessments', value: withAssessment },
        ].map(s => (
          <div key={s.label} className="card stat-card">
            <div className="stat-value">{loading ? '—' : s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          <h2 style={{ fontSize: 18 }}>Active Requisitions</h2>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <h2>No jobs posted yet</h2>
            <p>Click <strong>Post a Job</strong> to create your first listing.</p>
          </div>
        ) : (
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {jobs.map(job => (
              <div key={job.id} className="card job-card" style={{ padding: '20px', boxShadow: 'none', position: 'relative' }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 style={{ color: 'var(--text)', fontSize: '15px', textTransform: 'none', margin: 0, paddingRight: 80 }}>{job.job_details?.job_title || 'Untitled'}</h3>
                  <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <StatusBadge status={job.status} />
                    <button 
                      onClick={() => togglePublish(job.id, job.status)} 
                      style={{ fontSize: 10, background: 'none', border: 'none', color: job.status === 'published' ? 'var(--error)' : 'var(--success)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                      {job.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
                
                <div className="text-sm mb-4" style={{ color: 'var(--primary)' }}>{job.employer_details?.company_name || 'Internal'}</div>
                
                <div className="text-muted text-sm mb-4" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 40 }}>
                  {job.job_details?.roles_and_responsibilities || 'No roles assigned.'}
                </div>
                
                <div className="flex justify-between items-center text-xs text-muted mb-4 border-b pb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                  <span>{job.job_details?.job_location_type || 'Remote'}</span>
                  <span>{fmt(job.created_at)}</span>
                </div>
                
                <div className="flex justify-between items-center mt-auto">
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/assessment/${job.id}`)}>
                    {job.assessment_config?.goals?.length > 0 ? 'Edit Config' : 'Add AI Assessment'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/job/${job.id}/applications`)}>
                    View Candidates
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt-8" style={{ padding: 0, marginTop: '30px' }}>
        <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid var(--border)', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 18 }}>Recent Proctor Codes</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Top 20 Generations</span>
        </div>
        
        {codesLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
        ) : recentCodes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No codes generated yet.</div>
        ) : (
          <div className="table-responsive" style={{ padding: '10px' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ textAlign: 'left', background: 'var(--background-alt)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <tr>
                  <th style={{ padding: '12px 20px' }}>Code</th>
                  <th style={{ padding: '12px 20px' }}>Candidate</th>
                  <th style={{ padding: '12px 20px' }}>Target Job</th>
                  <th style={{ padding: '12px 20px' }}>Generated At</th>
                  <th style={{ padding: '12px 20px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCodes.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <code style={{ background: 'rgba(16, 157, 184, 0.1)', padding: '4px 8px', borderRadius: '4px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>
                        {item.code}
                      </code>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '500', color: 'var(--text)', fontSize: '14px' }}>{item.candidate_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.candidate_email}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px' }}>{item.job_title}</td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleString('en-GB')}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '4px 8px', 
                        borderRadius: '20px', 
                        background: item.status === 'pending' ? 'var(--background-alt)' : 'rgba(16, 157, 184, 0.1)', 
                        color: item.status === 'pending' ? 'var(--text-muted)' : 'var(--primary)',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
