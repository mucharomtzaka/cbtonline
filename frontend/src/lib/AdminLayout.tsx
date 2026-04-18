import { type ReactNode, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getCachedUser, logout, type User } from './auth'

type AdminLayoutProps = {
  children: ReactNode
  title?: string
}

type NavItem = {
  path: string
  label: string
  icon: string
  roles: string[]
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '◉', roles: [] },
  { path: '/users', label: 'Users', icon: '👥', roles: ['admin'] },
  { path: '/question-banks', label: 'Bank Soal', icon: '📚', roles: ['admin', 'guru'] },
  { path: '/exams', label: 'Ujian', icon: '📝', roles: ['admin', 'guru'] },
  { path: '/groups', label: 'Grup', icon: '👨‍👩‍👧', roles: ['admin', 'guru'] },
  { path: '/grading', label: 'Grading', icon: '✎', roles: ['admin', 'guru'] },
  { path: '/operator/exams/1/token', label: 'Token Ujian', icon: '🔑', roles: ['admin', 'operator'] },
  { path: '/reports', label: 'Reports', icon: '📊', roles: ['admin', 'guru', 'viewer'] },
  { path: '/settings', label: 'Pengaturan', icon: '⚙️', roles: ['admin'] },
]

function canAccess(item: NavItem, user: User | null): boolean {
  if (item.roles.length === 0) return true
  return item.roles.some((r) => user?.roles?.includes(r))
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const user = getCachedUser()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      setIsCompact(window.innerWidth <= 480)
      if (!mobile) setSidebarOpen(true)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [location.pathname, isMobile])

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const visibleNav = navItems.filter((item) => canAccess(item, user))

  const isActive = (itemPath: string) => {
    if (itemPath === '/') return location.pathname === '/'
    return location.pathname.startsWith(itemPath)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Mobile Header */}
      <header className="fixed md:hidden top-0 left-0 right-0 h-14 bg-[var(--bg)] border-b border-[var(--border)] flex items-center px-3 gap-2 z-[100]">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-[var(--social-bg)] rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <span className={`font-semibold text-[var(--text-h)] truncate ${isCompact ? 'text-sm' : 'text-base'}`}>CBT Online</span>
        <button
          onClick={onLogout}
          className="ml-auto p-2 hover:bg-[var(--social-bg)] rounded-lg transition-colors"
          aria-label="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 
        ${sidebarOpen ? 'w-56' : 'w-16'}
        bg-[var(--bg)] border-r border-[var(--border)] 
        flex flex-col transition-all duration-300 ease-in-out
        ${sidebarOpen || !isMobile ? 'translate-x-0' : '-translate-x-full'}
        ${isMobile ? 'w-56 top-14' : ''}
        h-screen
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-[var(--social-bg)] rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-[var(--accent)] truncate">CBT Online</h1>
              <div className="text-xs text-[var(--text)] opacity-75 truncate">{user?.name}</div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-[var(--social-bg)] rounded-lg transition-colors"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
          {visibleNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${isActive(item.path) 
                  ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium' 
                  : 'text-[var(--text)] hover:bg-[var(--social-bg)]'}
                ${!sidebarOpen ? 'md:justify-center md:px-2 md:py-3' : ''}
              `}
            >
              <span className="text-base">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`
        flex-1 p-4 md:p-6 pt-16 md:pt-6 min-h-screen transition-all duration-300
        ${!isMobile ? (sidebarOpen ? 'md:ml-0' : 'md:ml-16') : ''}
        ${isMobile && sidebarOpen ? '' : ''}
      `}>
        {title && (
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-[var(--text-h)]">{title}</h2>
          </div>
        )}
        <div>{children}</div>
      </main>
    </div>
  )
}