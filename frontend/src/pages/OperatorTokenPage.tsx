import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Exam = {
  id: number
  title: string
  description: string
  status: string
}

type Token = {
  id: number
  token: string
  is_active: boolean
  expires_at: string | null
  created_at: string
  generated_by_user_id: number
}

export default function OperatorTokenPage() {
  const user = getCachedUser()
  const can = user?.roles?.includes('operator') || user?.roles?.includes('admin')
  const { examId } = useParams()
  const navigate = useNavigate()

  // Exam list state
  const [exams, setExams] = useState<Exam[]>([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  // Token list state
  const [selectedExamId, setSelectedExamId] = useState(examId ? Number(examId) : 0)
  const [tokens, setTokens] = useState<Token[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [tokenPage, setTokenPage] = useState(1)
  const [tokenTotal, setTokenTotal] = useState(0)
  const [tokenLastPage, setTokenLastPage] = useState(1)

  // Token generation state
  const [expiresAt, setExpiresAt] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch exams with pagination
  useEffect(() => {
    if (!can) return
    api.get(`/exams?page=${currentPage}&per_page=10`)
      .then((r) => {
        setExams(r.data.data ?? [])
        setLastPage(r.data.last_page ?? 1)
      })
      .catch(() => {})
      .finally(() => setLoadingExams(false))
  }, [can, currentPage])

  // Fetch tokens when exam selected
  useEffect(() => {
    if (!can || !selectedExamId) return
    setLoadingTokens(true)
    api.get(`/exams/${selectedExamId}/tokens?page=${tokenPage}&per_page=10`)
      .then((r) => {
        setTokens(r.data.data ?? [])
        setTokenTotal(r.data.total ?? 0)
        setTokenLastPage(r.data.last_page ?? 1)
      })
      .catch(() => {})
      .finally(() => setLoadingTokens(false))
  }, [can, selectedExamId, tokenPage])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedExamId) return
    setErr(null)
    setNewToken(null)
    setSaving(true)
    try {
      const res = await api.post(`/exams/${selectedExamId}/token`, { expires_at: expiresAt || null })
      setNewToken(res.data.exam_access_token?.token ?? null)
      setExpiresAt('')
      // Refresh token list
      const r = await api.get(`/exams/${selectedExamId}/tokens?page=1&per_page=10`)
      setTokens(r.data.data ?? [])
      setTokenTotal(r.data.total ?? 0)
      setTokenLastPage(r.data.last_page ?? 1)
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Gagal generate token.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteToken(id: number) {
    if (!confirm('Hapus token ini?')) return
    try {
      await api.delete(`/exams/${selectedExamId}/tokens/${id}`)
      setTokens(tokens.filter(t => t.id !== id))
      setTokenTotal(t => t - 1)
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Gagal hapus token.')
    }
  }

  function goToExam(id: number) {
    navigate(`/operator/exams/${id}/token`)
    setSelectedExamId(id)
    setNewToken(null)
    setErr(null)
    setExpiresAt('')
    setTokenPage(1)
  }

  if (!can) {
    return (
      <AdminLayout title="Token Ujian">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya operator dan admin yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Token Ujian">
      <div className="max-w-4xl mx-auto">
        <div className="p-4 rounded-lg bg-[var(--social-bg)] mb-6">
          <div className="font-medium mb-1">Informasi</div>
          <div className="text-sm opacity-75">Generate token untuk mengizinkan peserta mengakses ujian. Token dapat digunakan oleh semua peserta yang belum memiliki akses.</div>
        </div>

        {/* Exam Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Pilih Ujian</h3>
          {loadingExams ? (
            <div className="text-sm opacity-60">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">ID</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Judul</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Status</th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center opacity-60 border-b border-[var(--border)]">Tidak ada ujian</td>
                    </tr>
                  ) : (
                    exams.map((exam) => (
                      <tr key={exam.id} className={`hover:bg-[var(--social-bg)] ${selectedExamId === exam.id ? 'bg-[var(--social-bg)]' : ''}`}>
                        <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{exam.id}</td>
                        <td className="px-3 py-3 text-sm border-b border-[var(--border)] font-medium">{exam.title}</td>
                        <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded ${exam.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {exam.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                          <button onClick={() => goToExam(exam.id)} className="px-3 py-1 text-xs bg-[var(--accent)] text-white rounded hover:opacity-90">
                            Pilih
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {lastPage > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">��� Prev</button>
              <span className="text-sm">{currentPage} / {lastPage}</span>
              <button onClick={() => setCurrentPage(p => Math.min(lastPage, p + 1))} disabled={currentPage >= lastPage} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next →</button>
            </div>
          )}
        </div>

        {/* Token Generation Form */}
        {selectedExamId > 0 && (
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-4">Generate Token Baru</h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expired at (opsional)</label>
                <input
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  placeholder="2026-04-20 10:00:00"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <div className="text-xs text-[var(--text)] opacity-70 mt-1">Kosongkan jika token tidak memiliki batas waktu</div>
              </div>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Generating...' : 'Generate Token'}
              </button>
            </form>
            {newToken && (
              <div className="mt-4 p-4 rounded-lg bg-cyan-50 border border-cyan-200">
                <div className="text-sm text-cyan-700 mb-2">Token berhasil dibuat:</div>
                <div className="font-mono text-lg break-all text-cyan-800">{newToken}</div>
              </div>
            )}
            {err && <div className="mt-4 p-4 rounded-lg bg-red-100 text-red-700 text-sm">{err}</div>}
          </div>
        )}

        {/* Tokens List */}
        {selectedExamId > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Daftar Token ({tokenTotal})</h3>
            {loadingTokens ? (
              <div className="text-center py-6 opacity-60">Loading...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">ID</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Token</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Status</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Expired</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Dibuat</th>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center opacity-60 border-b border-[var(--border)]">Belum ada token</td>
                        </tr>
                      ) : (
                        tokens.map((t) => (
                          <tr key={t.id} className="hover:bg-[var(--social-bg)]">
                            <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{t.id}</td>
                            <td className="px-3 py-3 text-sm border-b border-[var(--border)] font-mono">{t.token}</td>
                            <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                              <span className={`inline-block px-2 py-0.5 text-xs rounded ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {t.is_active ? 'active' : 'inactive'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                              {t.expires_at ? new Date(t.expires_at).toLocaleString() : '-'}
                            </td>
                            <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                              {new Date(t.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                              <button onClick={() => handleDeleteToken(t.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {tokenLastPage > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <button onClick={() => setTokenPage(p => Math.max(1, p - 1))} disabled={tokenPage <= 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">← Prev</button>
                    <span className="text-sm">{tokenPage} / {tokenLastPage}</span>
                    <button onClick={() => setTokenPage(p => Math.min(tokenLastPage, p + 1))} disabled={tokenPage >= tokenLastPage} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}