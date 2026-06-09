export default function TopNav() {
  return (
    <div className="top-nav">
      <div className="logo" style={{ cursor: 'default' }}>
        Seek<span>ATS</span>
      </div>
      
      <div className="nav-links">
        <button className="active">CV Analyzer</button>
      </div>

      <div className="flex items-center gap-4">
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Resume analysis only</span>
      </div>
    </div>
  )
}
