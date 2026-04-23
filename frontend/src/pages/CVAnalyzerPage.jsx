import { useState } from 'react'
import TopNav from '../components/TopNav'

export default function CVAnalyzerPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [jobTitle, setJobTitle] = useState("Senior Logistics Manager")
  const [error, setError] = useState(null)

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('job_title', jobTitle)

    try {
      const response = await fetch('http://localhost:8000/api/cv/analyze', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error("Analysis failed. Make sure the backend is running.")
      }
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <TopNav />
      <div className="hero-banner"></div>

      <div className="page-wrapper">
        <div className="flex justify-between items-center mb-6" style={{ color: 'white' }}>
          <h1 style={{ color: 'white', fontSize: '28px' }}>CV Analyzer</h1>
        </div>

        <div className="card mb-6" style={{ background: 'var(--surface)', padding: '32px', textAlign: 'center' }}>
          {!results && !loading && (
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--text)' }}>Upload Resume for Analysis</h2>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
                <label className="form-label">Target Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="form-input"
                  placeholder="Enter Target Job Title..."
                />
              </div>

              {error && <div style={{ color: 'var(--error)', marginBottom: '16px', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>{error}</div>}

              <div
                onClick={() => document.getElementById('fileInput').click()}
                style={{
                  border: '2px dashed var(--primary)',
                  padding: '40px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(16, 157, 184, 0.05)',
                  transition: 'all var(--transition)'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 157, 184, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(16, 157, 184, 0.05)'}
              >
                <input type="file" id="fileInput" hidden accept=".pdf" onChange={handleFileUpload} />
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                <h3 style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Click to Upload Resume (PDF)</h3>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ padding: '60px 0' }}>
              <div className="spinner" style={{ borderTopColor: 'var(--primary)', width: '40px', height: '40px', borderWidth: '4px' }}></div>
              <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '18px' }}>Analyzing your Resume...</p>
            </div>
          )}
        </div>

        {results && (
          <div>
            <button onClick={() => setResults(null)} className="btn btn-ghost mb-6">← Upload Another</button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }} className="gap-6">
              {/* Profile Card */}
              <div className="card">
                <div className="section-hd">
                  <h3>Candidate Profile</h3>
                  <h2>{results.candidate_name}</h2>
                </div>
                <div style={{ marginBottom: '8px' }}><strong>Email:</strong> {results.candidate_email}</div>
                <div><strong>Current Role:</strong> {results.current_title}</div>
              </div>

              {/* Score Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: 'white' }}>
                <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', opacity: 0.9 }}>ATS Readiness Score</div>
                <div style={{ fontSize: '64px', fontWeight: 'bold', lineHeight: 1 }}>{results.score}<span style={{ fontSize: '24px', opacity: 0.7 }}>/100</span></div>
              </div>
            </div>

            <div className="card mt-6">
              <div className="section-hd" style={{ marginBottom: 0 }}>
                <h3>Professional Summary</h3>
                <h2 style={{ fontSize: '16px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '8px', fontWeight: 'normal' }}>"{results.suggested_summary}"</h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }} className="mt-6 gap-6">
              {/* Red Flags */}
              <div className="card" style={{ borderLeft: '4px solid var(--error)' }}>
                <div className="section-hd">
                  <h3 style={{ color: 'var(--error)' }}>Red Flags</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.red_flags?.map((flag, i) => (
                    <div key={i} style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
                      <strong style={{ color: '#991b1b', display: 'block', fontSize: '12px' }}>{flag.type}</strong>
                      <span style={{ color: '#b91c1c', fontSize: '13px' }}>{flag.description}</span>
                    </div>
                  ))}
                  {(!results.red_flags || results.red_flags.length === 0) && <p className="text-muted">No red flags found.</p>}
                </div>
              </div>

              {/* Improvements */}
              <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                <div className="section-hd">
                  <h3 style={{ color: 'var(--success)' }}>Strategic Improvements</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.improvements?.map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#dcfce7', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>Issue: {item.issue}</div>
                      <div style={{ fontSize: '13px', color: '#15803d' }}>Fix: {item.fix}</div>
                    </div>
                  ))}
                  {(!results.improvements || results.improvements.length === 0) && <p className="text-muted">No improvements needed.</p>}
                </div>
              </div>
            </div>

            {/* Courses */}
            <div className="card mt-6">
              <div className="section-hd" style={{ marginBottom: '16px' }}>
                <h3>Suggested Upskilling</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {results.suggested_courses?.map((course, i) => (
                  <div key={i} className="chip active">{course}</div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
