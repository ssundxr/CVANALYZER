import TopNav from './TopNav'

export default function Layout({ title, actions, children }) {
  return (
    <div className="app-shell">
      <TopNav />
      {/* The thick blue contextual header matching the screenshot */}
      <div className="hero-banner"></div>
      
      <div className="page-wrapper">
        <div className="flex justify-between items-center mb-6" style={{ color: 'white' }}>
           <h1 style={{ color: 'white', fontSize: '28px' }}>{title}</h1>
           {actions && <div className="flex gap-2">{actions}</div>}
        </div>
        
        <div>{children}</div>
      </div>
    </div>
  )
}
