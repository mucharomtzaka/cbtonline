import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser, me, type User } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Exam = {
  id: number
  title: string
  description: string
  duration_seconds: number | null
  status: string
  allow_retake?: boolean
  attempt_limit?: number
  show_result_after_submit?: boolean
  show_result_after_end?: boolean
}

type Attempt = {
  id: number
  status: string
  score: number | null
  started_at: string
  submitted_at: string | null
}

// Exam Card with reset/retake
function ExamCard({ exam }: { exam: Exam }) {
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    api.get(`/exams/${exam.id}/status`)
      .then(r => setAttempts(r.data.attempts || []))
      .catch(() => {})
      .finally(() => setLoadingAttempts(false))
  }, [exam.id])

  const latestAttempt = attempts[0]
  const canRetake = exam.allow_retake && (!exam.attempt_limit || attempts.length < exam.attempt_limit)

  async function handleReset() {
    if (!confirm('Yakin ingin mengulang ujian? Semua jawaban akan dihapus.')) return
    setResetting(true)
    try {
      await api.post(`/exams/${exam.id}/reset`)
      setAttempts([])
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal mereset')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg hover:border-[var(--accent)] transition-colors bg-[var(--bg)]">
      <div className="font-semibold text-[var(--text-h)] mb-2">{exam.title}</div>
      <div className="text-sm text-[var(--text)] opacity-75 mb-3">{exam.description}</div>
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-[var(--text)] opacity-60">Durasi: {Math.floor((exam.duration_seconds || 0) / 60)} menit</span>
        <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">{exam.status}</span>
      </div>
      {!loadingAttempts && ['submitted', 'auto_submitted', 'graded'].includes(latestAttempt?.status || '') && (
        <div className="mb-3 p-2 rounded bg-[var(--social-bg)] text-sm">
          <div className="flex justify-between items-center">
            {canRetake && (
              <button onClick={handleReset} disabled={resetting} className="text-xs text-blue-600 hover:underline">
                {resetting ? '...' : 'Ulangi'}
              </button>
            )}
          </div>
        </div>
      )}

      {['submitted', 'auto_submitted', 'graded'].includes(latestAttempt?.status || '') ? (
        <Link 
          to={`/results/exams/${exam.id}`}
          className="block w-full py-2 text-center rounded-lg font-medium bg-green-600 text-white hover:opacity-90"
        >
          Lihat Hasil
        </Link>
      ) : (
        <Link 
          to={`/exams/${exam.id}/start`} 
          className={`block w-full py-2 text-center rounded-lg font-medium ${
            latestAttempt?.status === 'in_progress'
              ? 'bg-yellow-500 text-white hover:opacity-90'
              : 'bg-[var(--accent)] text-white hover:opacity-90'
          }`}
        >
          {latestAttempt?.status === 'in_progress' ? 'Lanjutkan' : 'Ikuti Ujian'}
        </Link>
      )}
    </div>
  )
}

type MenuItem = {
  title: string
  desc: string
  link: string
  icon: string
  roles: string[]
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(getCachedUser())
  const [exams, setExams] = useState<Exam[]>([])
  const [loadingExams, setLoadingExams] = useState(false)

  useEffect(() => {
    me().then(setUser).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    if (!user.roles.includes('peserta')) return
    
    setLoadingExams(true)
    api.get('/exams?status=active')
      .then((r) => setExams(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingExams(false))
  }, [user])

  if (!user) return null

  const menuItems: MenuItem[] = [
    // Admin only
    {
      title: 'Manajemen Users',
      desc: 'Kelola semua user sistem',
      link: '/users',
      icon: '👥',
      roles: ['admin'],
    },
    // Guru / Admin
    {
      title: 'Bank Soal',
      desc: 'Kelola bank soal dan pertanyaan',
      link: '/question-banks',
      icon: '📚',
      roles: ['admin', 'guru'],
    },
    {
      title: 'Kelola Ujian',
      desc: 'Buat dan manage ujian',
      link: '/exams',
      icon: '📝',
      roles: ['admin', 'guru'],
    },
    {
      title: 'Grup Peserta',
      desc: 'Kelola grup peserta ujian',
      link: '/groups',
      icon: '👨‍👩‍👧',
      roles: ['admin', 'guru'],
    },
    {
      title: 'Grading Essay',
      desc: 'Berikan nilai jawaban essay',
      link: '/grading',
      icon: '✎',
      roles: ['admin', 'guru'],
    },
    // Operator / Admin
    {
      title: 'Generate Token',
      desc: 'Buat token akses ujian',
      link: '/operator/exams/1/token',
      icon: '🔑',
      roles: ['admin', 'operator'],
    },
    // Viewer / Guru / Admin
    {
      title: 'Reports & Statistik',
      desc: 'Lihat hasil dan statistik ujian',
      link: '/reports',
      icon: '📊',
      roles: ['admin', 'guru', 'viewer'],
    },
  ]

  const visibleItems = menuItems.filter((item) => {
    if (item.roles.length === 0) return true
    return item.roles.some((r) => user.roles.includes(r))
  })

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    guru: 'Guru',
    operator: 'Operator',
    viewer: 'Viewer',
    peserta: 'Peserta',
  }

  const isPeserta = user.roles.includes('peserta')

  return (
    <AdminLayout title="Dashboard">
      {/* User Header */}
      <div className="flex items-center gap-4 p-4 mb-6 rounded-lg bg-[var(--social-bg)]">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent)] text-white text-xl font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold text-[var(--text-h)]">{user.name}</div>
          <div className="text-sm text-[var(--text)] opacity-75">@{user.username}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <span key={role} className="px-2.5 py-1 text-xs font-medium rounded bg-[var(--accent-bg)] text-[var(--accent)]">
              {roleLabels[role] || role}
            </span>
          ))}
        </div>
      </div>

      {/* Exam List for Peserta */}
      {isPeserta && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-h)]">Ujian Aktif</h3>
          {loadingExams ? (
            <div className="text-center py-8 opacity-60">Loading...</div>
          ) : exams.length === 0 ? (
            <div className="text-center py-8 p-6 border rounded-lg opacity-60">
              Tidak ada ujian aktif saat ini
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Menu Grid */}
      {visibleItems.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text)] opacity-60">Menu</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleItems.map((item) => (
              <Link
                key={item.link}
                to={item.link}
                className="block p-5 border rounded-lg hover:border-[var(--accent)] hover:shadow-lg transition-all bg-[var(--bg)]"
              >
                <span className="block text-3xl mb-3">{item.icon}</span>
                <div className="font-semibold text-[var(--text-h)] mb-1">{item.title}</div>
                <div className="text-sm text-[var(--text)] opacity-75">{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}