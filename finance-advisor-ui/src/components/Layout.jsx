import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Transactions', icon: '💳' },
  { to: '/advisor', label: 'AI Advisor', icon: '🤖' },
]

export default function Layout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💎</div>
          <span className="sidebar-logo-text">FinSight</span>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-label">Navigation</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link btn-ghost" style={{ width: '100%', border: 'none' }} onClick={handleLogout}>
            <span className="nav-link-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}
