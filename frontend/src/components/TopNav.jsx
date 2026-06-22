import { useState } from 'react';

export default function TopNav() {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="top-nav" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div 
          className="logo" 
          style={{ cursor: 'pointer', margin: 0 }}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          Team-AltF4
        </div>
        <span style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', marginTop: '4px' }}>
          ← click here !
        </span>
      </div>
      
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '20px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          color: '#333',
          minWidth: '350px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold', color: '#111' }}>ALLIANCE UNIVERSITY</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>Team : AltF4</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: '1.8', color: '#444' }}>
            <li>1. shyam sunder - sshyamlebtech24@ced.alliance.edu.in</li>
            <li>2. Rahul Santosh - rthunuguntlabtech23@ced.alliance.edu.in</li>
            <li>3. Utsav Raj - rutsavbtech23@ced.alliance.edu.in</li>
            <li>4. Supriya - bsupriyabtech23@ced.alliance.edu.in</li>
            <li>5. Mounika - mdhanekulabtech23@ced.alliance.edu.in</li>
          </ul>
        </div>
      )}

      <div className="nav-links">
        <button className="active">SkillSync AI</button>
      </div>

      <div className="flex items-center gap-4">
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Resume analysis only</span>
      </div>
    </div>
  )
}
