import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'

export default function ReportViewPage() {
  const { appId } = useParams()
  const [application, setApplication] = useState(null)
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // This is a naive way to fetch just one application. 
    // Usually there'd be an api.getJobApplication(appId) route, but since we don't have it, 
    // we'll fetch the job ID from local storage or context, or unfortunately we can't easily without the router.
    // Wait, the API doesn't have a direct GET /applications/:appId.
    // Let me write a direct ping logic. I will fetch all and find it, but I don't know the jobId immediately.
    // Oh, I will update the backend to support GET /api/applications/:appId.
    api.getApplication(appId)
      .then(res => {
        setApplication(res.application)
        return api.getJob(res.application.job_post_id)
      })
      .then(res => setJob(res.job))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [appId])

  if (loading) return <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>Loading report...</div>
  if (error) return <div style={{ padding: '40px', fontFamily: 'sans-serif', color: 'red' }}>Error: {error}</div>
  if (!application || !application.assessment_attempt) return <div style={{ padding: '40px' }}>No assessment data found.</div>

  const { assessment_attempt: attempt } = application
  const { score_details, answers, warnings_count } = attempt
  const allQuestions = job?.assessment_config?.generated_assessment?.sections?.flatMap(s => s.questions) || []

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px', fontFamily: 'system-ui, sans-serif', color: '#1a2b3c', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e0e9f4', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0' }}>Candidate Assessment Report</h1>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{application.candidate?.display_name}</div>
          <div style={{ color: '#536f8d', marginTop: '4px' }}>{application.candidate?.email} • Application #{application.id}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <button className="no-print" onClick={() => window.print()} style={{ padding: '8px 16px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>Download PDF</button>
          <div style={{ fontSize: '14px', color: '#536f8d' }}>Job: {job?.job_details?.job_title}</div>
          <div style={{ fontSize: '14px', color: '#536f8d' }}>Date: {new Date(attempt.completed_at).toLocaleDateString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <div style={{ flex: 1, padding: '20px', background: '#f2f7fd', borderRadius: '8px', border: '1px solid #d1dfed' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#536f8d', fontWeight: 'bold' }}>Total Score</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0056b3' }}>
            {score_details?.total_score || 0} / {score_details?.max_score || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#536f8d' }}>({score_details?.percentage}%)</div>
        </div>
        <div style={{ flex: 1, padding: '20px', background: warnings_count > 0 ? '#fdf2f2' : '#f2fcf5', borderRadius: '8px', border: `1px solid ${warnings_count > 0 ? '#f8d7da' : '#d4edda'}` }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#536f8d', fontWeight: 'bold' }}>Proctoring Violations</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: warnings_count > 0 ? '#d93025' : '#1e8e3e' }}>
            {warnings_count} Strikes
          </div>
          <div style={{ fontSize: '14px', color: '#536f8d' }}>Browser focus integrity</div>
        </div>
      </div>

      <h2 style={{ fontSize: '20px', borderBottom: '1px solid #e0e9f4', paddingBottom: '10px', marginBottom: '20px' }}>Question Breakdown</h2>
      
      {allQuestions.map((q, idx) => {
        // Need to find this question in the semantic breakdown list
        const bdList = score_details?.breakdown || []
        const result = bdList.find(b => b.question_id === String(q.id))
        const candidateAns = answers[q.id]
        const isCorrect = (result?.score || 0) >= ((result?.max || 1) * 0.7) // Roughly 70% threshold

        return (
          <div key={q.id} style={{ marginBottom: '30px', pageBreakInside: 'avoid', border: '1px solid #d1dfed', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', background: '#f2f7fd', borderBottom: '1px solid #d1dfed', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Question {idx + 1}</span>
              <span style={{ fontWeight: 'bold', color: isCorrect ? '#1e8e3e' : '#d93025' }}>
                Score: {result?.score || 0} / {result?.max || 1}
              </span>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '20px' }}>{q.question}</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#536f8d', fontWeight: 'bold', marginBottom: '6px' }}>Candidate's Answer</div>
                  <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                    {candidateAns || <em style={{ color: '#94a3b8' }}>No answer provided</em>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#536f8d', fontWeight: 'bold', marginBottom: '6px' }}>Model Reference</div>
                  <div style={{ padding: '12px', background: '#eef2f7', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                    {q.correct_answer || "Contextual AI Evaluation"}
                  </div>
                </div>
              </div>

              {result?.feedback && (
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e0e9f4', fontSize: '14px' }}>
                  <strong style={{ color: '#0056b3' }}>AI Evaluator Feedback:</strong> {result.feedback}
                </div>
              )}
            </div>
          </div>
        )
      })}
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}} />
    </div>
  )
}
