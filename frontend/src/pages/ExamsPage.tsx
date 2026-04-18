import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Exam = {
  id: number
  title: string
  description: string
  duration_seconds: number | null
  participants_count: number
  status: string
  created_at: string
  scoring_type?: string
  negative_mark?: number
  question_weight?: number
}

export default function ExamsPage() {
  const user = getCachedUser()
  const canAccess = user?.roles?.includes('admin') || user?.roles?.includes('guru')

  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', duration_minutes: '', allow_retake: false, scoring_type: 'simple', negative_mark: '', question_weight: '' })
  const [saving, setSaving] = useState(false)
  const [reseting, setReseting] = useState<number | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetType, setResetType] = useState<'all' | 'participant' | null>(null)
  const [targetExam, setTargetExam] = useState<Exam | null>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [participantFilter, setParticipantFilter] = useState('')
  const [resettingUserId, setResettingUserId] = useState<number | null>(null)

  useEffect(() => {
    if (!canAccess) return
    api.get('/exams').then((r) => {
      const examsList = (r.data.data ?? []).map((e: any) => ({
        ...e,
        participants_count: e.registrations_count ?? 0,
      }))
      setExams(examsList)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [canAccess])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = { title: form.title, description: form.description }
      if (form.duration_minutes) payload.duration_seconds = parseInt(form.duration_minutes) * 60
      payload.allow_retake = form.allow_retake
      await api.post('/exams', payload)
      setForm({ title: '', description: '', duration_minutes: '', allow_retake: false, scoring_type: 'simple', negative_mark: '', question_weight: '' })
      setShowForm(false)
      const r = await api.get('/exams')
      const examsList = (r.data.data ?? []).map((e: any) => ({
        ...e,
        participants_count: e.registrations_count ?? 0,
      }))
      setExams(examsList)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal membuat ujian')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await api.put(`/exams/${id}`, { status })
      setExams(exams.map(e => e.id === id ? { ...e, status } : e))
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal ubah status')
    }
  }

  async function handleReset(examId: number) {
    if (!confirm('Yakin ingin mereset semua attempt ujian ini? Semua jawaban akan dihapus.')) return
    setReseting(examId)
    try {
      const res = await api.post(`/exams/${examId}/reset-all`)
      alert(res.data.message || 'Berhasil mereset')
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal mereset')
    } finally {
      setReseting(null)
    }
  }

  function openResetModal(exam: Exam, type: 'all' | 'participant') {
    setTargetExam(exam)
    setResetType(type)
    if (type === 'participant') {
      setLoadingParticipants(true)
      setParticipants([])
      api.get(`/exams/${exam.id}/participants`).then((r) => {
        setParticipants(r.data.data ?? [])
      }).catch(() => {
        alert('Gagal memuat peserta')
      }).finally(() => setLoadingParticipants(false))
    }
    setShowResetModal(true)
  }

  async function handleResetUser(userId: number) {
    if (!confirm('Yakin ingin mereset attempt peserta ini? Semua jawabannya akan dihapus.')) return
    setResettingUserId(userId)
    try {
      const res = await api.post(`/exams/${targetExam!.id}/reset-all`, { user_id: userId })
      alert(res.data.message || 'Berhasil mereset')
      setShowResetModal(false)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal mereset')
    } finally {
      setResettingUserId(null)
    }
  }

  if (!canAccess) {
    return (
      <AdminLayout title="Ujian">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin dan guru yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Kelola Ujian">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold m-0">Daftar Ujian</h3>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
          + Buat Ujian
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-60">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)]">ID</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)]">Judul</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)]">Durasi</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)]">Peserta</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)]">Status</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-[var(--social-bg)]">
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{exam.id}</td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                    <div className="font-medium">{exam.title}</div>
                    <div className="text-xs text-[var(--text)] opacity-60">{exam.description}</div>
                  </td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{exam.duration_seconds ? `${Math.floor(exam.duration_seconds / 60)} menit` : '-'}</td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{exam.participants_count}</td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                    <select
                      value={exam.status || 'draft'}
                      onChange={(e) => handleStatusChange(exam.id, e.target.value)}
                      className={`px-2 py-0.5 text-xs rounded border cursor-pointer ${
                        exam.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' : 
                        exam.status === 'closed' ? 'bg-red-100 text-red-700 border-red-200' : 
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      <option value="draft">draft</option>
                      <option value="active">active</option>
                      <option value="closed">closed</option>
                    </select>
                  </td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                    <div className="flex flex-wrap gap-1">
                      <Link to={`/exams/${exam.id}/participants`} className="px-2 py-1 text-xs border rounded hover:border-[var(--accent)]">Peserta</Link>
                      <Link to={`/exams/${exam.id}/questions`} className="px-2 py-1 text-xs border rounded hover:border-[var(--accent)]">Soal</Link>
                      <Link to={`/reports/exams/${exam.id}`} className="px-2 py-1 text-xs border rounded hover:border-[var(--accent)]">Laporan</Link>
                      <button onClick={() => openResetModal(exam, 'all')} disabled={reseting === exam.id} className="px-2 py-1 text-xs border rounded hover:border-[var(--accent)]">
                        Reset Semua
                      </button>
                      <button onClick={() => openResetModal(exam, 'participant')} className="px-2 py-1 text-xs border rounded hover:border-[var(--accent)]">
                        Reset per Peserta
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">Buat Ujian Baru</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Judul Ujian</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Durasi (menit)</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" type="number" placeholder="Kosongkan jika tidak terbatas" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.allow_retake} onChange={(e) => setForm({ ...form, allow_retake: e.target.checked })} />
                  <span>Izinkan pengulangan ujian</span>
                </label>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && targetExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowResetModal(false)}>
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">
              {resetType === 'all' ? 'Reset Semua' : 'Reset per Peserta'} - {targetExam.title}
            </h3>
            
            {resetType === 'all' ? (
              <div>
                <p className="mb-4 text-sm opacity-80">Semua attempt peserta akan dihapus. Apakah Anda yakin?</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowResetModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button onClick={() => { handleReset(targetExam.id); setShowResetModal(false); }} disabled={reseting === targetExam.id} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
                    {reseting === targetExam.id ? 'Mereset...' : 'Reset Semua'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {loadingParticipants ? (
                  <div className="text-center py-4 opacity-60">Memuat peserta...</div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-4 opacity-60">Tidak ada peserta terdaftar.</div>
                ) : (
                  <>
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Cari username..."
                        value={participantFilter}
                        onChange={(e) => setParticipantFilter(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {participants
                        .filter((p: any) => 
                          !participantFilter || 
                          p.user?.username?.toLowerCase().includes(participantFilter.toLowerCase()) ||
                          p.user?.name?.toLowerCase().includes(participantFilter.toLowerCase()) ||
                          p.user?.email?.toLowerCase().includes(participantFilter.toLowerCase())
                        )
                        .map((p: any) => (
                          <div key={p.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{p.user?.name || 'Unknown'}</div>
                              <div className="text-xs opacity-60">
                                {p.user?.username && <span className="mr-2">@{p.user.username}</span>}
                                {p.user?.email}
                              </div>
                            </div>
                            <button onClick={() => handleResetUser(p.user_id)} disabled={resettingUserId === p.user_id} className="px-3 py-1 border border-red-500 text-red-600 rounded text-xs hover:bg-red-50">
                              {resettingUserId === p.user_id ? '...' : 'Reset'}
                            </button>
                          </div>
                        ))}
                    </div>
                  </>
                )}
                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={() => setShowResetModal(false)} className="px-4 py-2 border rounded-lg text-sm">Tutup</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}