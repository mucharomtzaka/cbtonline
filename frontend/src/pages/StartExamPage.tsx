import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'

type Exam = {
  id: number
  title: string
  description: string
  duration_seconds: number | null
  attempt_limit: number
  status: string
}

export default function StartExamPage() {
  const { examId } = useParams()
  const nav = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loadingExam, setLoadingExam] = useState(true)
  const [accessToken, setAccessToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!examId) return
    api.get(`/exams/${examId}`)
      .then((r) => setExam(r.data.exam))
      .catch(() => {})
      .finally(() => setLoadingExam(false))
  }, [examId])

  async function onStart(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.post(`/exams/${examId}/start`, { access_token: accessToken })
      const attemptId = res.data.attempt.id as number
      sessionStorage.setItem(`attempt:${attemptId}`, JSON.stringify(res.data))
      nav(`/attempts/${attemptId}`, { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memulai ujian.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="text-center opacity-60">Loading...</div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="text-center text-red-600">Ujian tidak ditemukan</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-md p-6 border rounded-xl bg-[var(--bg)] shadow-lg">
        {/* Exam Info */}
        <div className="mb-6 p-4 rounded-lg bg-[var(--social-bg)]">
          <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Informasi Ujian</div>
          <h2 className="text-xl font-semibold mb-2 text-[var(--text-h)]">{exam.title}</h2>
          <p className="text-sm opacity-75 mb-4">{exam.description}</p>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs opacity-60">Durasi</div>
              <div className="font-medium">
                {exam.duration_seconds ? `${Math.floor(exam.duration_seconds / 60)} menit` : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-60">Batas Attempt</div>
              <div className="font-medium">{exam.attempt_limit}x</div>
            </div>
            <div>
              <div className="text-xs opacity-60">Status</div>
              <div className="font-medium">
                <span className={`px-2 py-0.5 text-xs rounded ${
                  exam.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {exam.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={onStart} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Token / Kode akses</label>
            <input
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Contoh: ABCD1234"
              className="w-full px-3 py-2.5 border rounded-lg text-sm"
              required
            />
            <div className="text-xs text-[var(--text)] opacity-60 mt-1">Minta kode akses kepada pengawas ujian</div>
          </div>

          {error && (
            <div className="p-3 text-sm text-center text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Mulai Ujian'}
          </button>
        </form>
      </div>
    </div>
  )
}