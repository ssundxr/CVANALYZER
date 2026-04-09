import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cApi } from '../api/candidateClient'

export default function ProctoredAssessment() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  
  // Proctor Code
  const [proctorCode, setProctorCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  
  // Anti-cheat
  const [warnings, setWarnings] = useState(0)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningReason, setWarningReason] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  
  // Interaction & Timer
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60 * 60) // Default 60 mins

  const containerRef = useRef(null)

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsMobile(true)
    }
    
    cApi.getAssessment(attemptId)
      .then(res => {
        setData(res)
        if (res.assessment_config?.time_limit_minutes) {
           setTimeLeft(res.assessment_config.time_limit_minutes * 60)
        }
        // If it's already in_progress, it means they might have refreshed. 
        // Our endpoint handles this securely, but if we have `res.assessment` we can just start.
        if (res.attempt?.status === "in_progress") {
          setStarted(true)
        }
      })
      .catch(err => {
        alert(err.message)
        navigate('/candidate/dashboard')
      })
      .finally(() => setLoading(false))
  }, [attemptId, navigate])

  const startAssessment = async () => {
    if (isMobile) return alert("Use a laptop/desktop to start the assessment.")
    if (!proctorCode.trim()) return alert("Please enter the Proctor Access Code sent to your email.")
    
    setVerifying(true)
    try {
      const res = await cApi.verifyProctorCode(attemptId, proctorCode)
      setData(res)
      
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
      setStarted(true)
    } catch (err) {
      alert("Verification Failed: " + err.message)
    } finally {
      setVerifying(false)
    }
  }

  // Anti-Cheat & Timer Listeners
  useEffect(() => {
    if (!started) return

    // Timer Loop
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval)
          handleFinalSubmit(answers, warnings, true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const handleCheat = (reasonText) => {
      if (submitting) return
      
      setWarnings(w => {
        const newW = w + 1
        if (newW >= 3) {
          handleFinalSubmit(answers, newW, true)
          return newW
        }
        setWarningReason(reasonText)
        setShowWarningModal(true)
        return newW
      })
    }

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleCheat('You exited full screen mode.')
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
         handleCheat('You switched tabs or minimized the browser.')
      }
    }

    const onKeyDown = (e) => {
      const restricted = ['Alt', 'Meta', 'Control', 'PrintScreen']
      if (restricted.includes(e.key)) {
        e.preventDefault()
        handleCheat(`You pressed a restricted key: ${e.key}`)
      }
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      clearInterval(timerInterval)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [started, submitting, answers]) 

  const handleFinalSubmit = async (currentAnswers, finalWarnings, autoSubmitting = false) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await cApi.submitAssessment(attemptId, {
        answers: currentAnswers,
        warnings_count: finalWarnings
      })
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(e=>console.log(e))
      }
      alert(autoSubmitting ? "Assessment automatically submitted due to rules violation." : "Successfully submitted.")
      navigate('/candidate/dashboard')
    } catch (e) {
      alert("Failed to submit: " + e.message)
      setSubmitting(false)
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const renderContent = () => {
    if (!data) return null
    const { assessment } = data
    
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg)' }}>
        
        {/* Left fixed Sidebar */}
        <div style={{ width: '280px', background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '30px 20px', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0 }}>
          <h2 style={{ fontSize: 18, marginBottom: '20px', color: 'var(--text)' }}>{data.job_title}</h2>
          
          <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border-mid)', marginBottom: '30px' }}>
             <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time Remaining</div>
             <div style={{ fontSize: 32, fontWeight: 'bold', color: timeLeft < 300 ? 'var(--error)' : 'var(--text)' }}>
               {formatTime(timeLeft)}
             </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', flex: 1 }}>
             <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-muted)' }}>Assessment Status</div>
             <div style={{ marginTop: '10px', fontSize: '13px' }}>
                <span style={{ color: warnings > 0 ? 'var(--error)' : 'var(--text)' }}>
                  ⚠️ Warnings: {warnings} / 3
                </span>
             </div>
             <div style={{ marginTop: '10px', fontSize: '13px' }}>
                Total Questions: {assessment.total_questions}
             </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleFinalSubmit(answers, warnings)} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Finish & Submit'}
          </button>
        </div>

        {/* Main scrollable content */}
        <div style={{ flex: 1, marginLeft: '280px', padding: '40px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            {assessment.sections?.map((sec, sIdx) => (
              <div key={sIdx} style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: 20, marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>
                  Section {sIdx+1}: {sec.label}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {sec.questions?.map((q, qIdx) => (
                    <div key={q.id} style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>Question {qIdx+1}</div>
                      <div style={{ fontSize: 16, marginBottom: 20, fontWeight: 500 }}>{q.question}</div>
                      
                      {['mcq', 'yes_no'].includes(sec.type) ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                          {q.options?.map(opt => (
                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: `1px solid ${answers[q.id] === opt[0] ? 'var(--border-active)' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', background: answers[q.id] === opt[0] ? 'var(--surface-hover)' : 'var(--surface)', transition: 'all var(--transition)' }}>
                              <input type="radio" name={`q_${q.id}`} value={opt[0]} checked={answers[q.id] === opt[0]} onChange={() => setAnswers(prev => ({...prev, [q.id]: opt[0]}))}/>
                              <span style={{ fontSize: 14 }}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea 
                          className="form-textarea" 
                          placeholder="Type your detailed answer here..."
                          value={answers[q.id] || ''}
                          onChange={e => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                          rows={6}
                          style={{ fontSize: 14 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div className="assessment-loading p-10">Loading...</div>

  if (isMobile) {
    return (
      <div className="login-page">
        <div className="login-card text-center">
          <h2>💻 Desktop Required</h2>
          <p className="mt-2 text-muted">This high-integrity assessment requires a desktop environment (screen width ≥ 1024px).</p>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="login-page">
         <div className="login-card" style={{ width: '500px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)' }}>
            <h1 className="login-title mb-4 text-center">Proctored Assessment Rules</h1>
            <div style={{ padding: '20px', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '20px' }}>
              <ul style={{ paddingLeft: 20, fontSize: 14, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <li><strong>Full Screen Enforced:</strong> You cannot exit full screen mode at any time.</li>
                <li><strong>Strict Focus:</strong> Do not change tabs, open other applications, or minimize the browser.</li>
                <li><strong>Keyboard Monitoring:</strong> The use of Windows Command, Control, Alt, or PrintScreen keys is actively restricted.</li>
                <li><strong>Three-Strike Policy:</strong> Any violation results in a warning. On your 3rd warning, the test is instantly & permanently submitted.</li>
              </ul>
            </div>
            
            <div className="form-group mb-4">
              <label className="form-label text-center" style={{ display: 'block', fontSize: '13px' }}>Proctor Access Code (check email)</label>
              <input 
                className="form-input" 
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '2px', padding: '12px' }} 
                type="text" 
                maxLength={6} 
                value={proctorCode} 
                onChange={e => setProctorCode(e.target.value.toUpperCase())} 
                placeholder="XXXXXX" 
              />
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={startAssessment} disabled={verifying}>
              {verifying ? 'Verifying...' : 'Unlock Assessment'}
            </button>
         </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ background: 'var(--bg)', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {showWarningModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="card" style={{ width: 450, transform: 'scale(1)', textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ color: 'var(--error)', fontSize: '24px' }}>Warning {warnings} of 3</h2>
              <p className="mt-3" style={{ fontSize: '15px' }}>{warningReason}</p>
              <p className="mt-2 text-muted" style={{ fontSize: '13px' }}>Any severe violation of the proctoring rules reduces your remaining strikes.</p>
              <button className="btn btn-danger mt-6" style={{ padding: '12px 24px', fontSize: '15px' }} onClick={async () => {
                setShowWarningModal(false)
                if (document.documentElement.requestFullscreen) {
                  await document.documentElement.requestFullscreen().catch(()=>null)
                }
              }}>Acknowledge & Resume</button>
           </div>
        </div>
      )}

      {renderContent()}
    </div>
  )
}
