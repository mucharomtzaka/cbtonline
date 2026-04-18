import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type PendingAttempt = {
  id: number
  submitted_at: string | null
  user: { id: number; name: string; username: string }
  exam: { id: number; title: string }
}

type AttemptDetail = {
  id: number
  exam: { id: number; title: string }
  user: { id: number; name: string; username: string; email: string }
  answers: Array<{
    question_id: number
    answer: any
    score_awarded: number | null
    question: { id: number; type: string; prompt: string }
  }>
}

export default function GradingPage() {
  const user = getCachedUser()
  const canGrade = user?.roles?.includes('guru') || user?.roles?.includes('admin')

  const [pending, setPending] = useState<PendingAttempt[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AttemptDetail | null>(null)
  const [scores, setScores] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!canGrade) return
    api.get('/grading/pending-essays').then((r) => setPending(r.data.data ?? [])).catch(() => {})
  }, [canGrade])

  useEffect(() => {
    if (!selectedId) return
    setDetail(null)
    api.get(`/grading/attempts/${selectedId}`).then((r) => {
      const a = r.data.attempt as AttemptDetail
      setDetail(a)
      const initial: Record<number, number> = {}
      for (const ans of a.answers) {
        if (ans.question?.type === 'essay') initial[ans.question_id] = ans.score_awarded ?? 0
      }
      setScores(initial)
    }).catch(() => {})
  }, [selectedId])

  const essayAnswers = useMemo(() => {
    return (detail?.answers ?? []).filter((a) => a.question?.type === 'essay')
  }, [detail])

  async function submitGrades() {
    if (!selectedId) return
    setLoading(true)
    setMsg(null)
    try {
      const answers = Object.entries(scores).map(([question_id, score_awarded]) => ({
        question_id: Number(question_id),
        score_awarded,
      }))
      await api.post(`/grading/attempts/${selectedId}`, { answers })
      setMsg('Tersimpan. Attempt sudah graded.')
      setSelectedId(null)
      setDetail(null)
      const r = await api.get('/grading/pending-essays')
      setPending(r.data.data ?? [])
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? 'Gagal simpan grading.')
    } finally {
      setLoading(false)
    }
  }

  if (!canGrade) {
    return (
      <AdminLayout title="Grading">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya guru dan admin yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Grading Essay">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending list */}
        <div className="border rounded-lg p-4 bg-[var(--bg)]">
          <h3 className="font-semibold mb-4">Pending Attempts</h3>
          <div className="space-y-3">
            {pending.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedId === p.id 
                    ? 'border-[var(--accent)] bg-[var(--accent-bg)]' 
                    : 'border-[var(--border)] hover:border-[var(--accent)]'
                }`}
              >
                <div className="font-medium text-[var(--text-h)]">{p.exam.title}</div>
                <div className="text-sm text-[var(--text)] opacity-75">{p.user.name} (@{p.user.username})</div>
                <div className="text-xs text-[var(--text)] opacity-60 mt-1">#{p.id}</div>
              </button>
            ))}
            {pending.length === 0 && (
              <div className="text-center py-8 opacity-60">Tidak ada yang pending</div>
            )}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="lg:col-span-2 border rounded-lg p-4 bg-[var(--bg)]">
          <h3 className="font-semibold mb-4">Detail Jawaban</h3>
          {!detail ? (
            <div className="text-center py-8 opacity-60">Pilih attempt di kiri</div>
          ) : (
            <div>
              <div className="p-3 rounded-lg bg-[var(--social-bg)] mb-4">
                <div className="font-medium">{detail.exam.title}</div>
                <div className="text-sm opacity-75">{detail.user.name} (@{detail.user.username})</div>
              </div>

              <div className="space-y-4">
                {essayAnswers.map((a) => (
                  <div key={a.question_id} className="p-4 border rounded-lg">
                    <div className="text-sm font-medium text-[var(--accent)] mb-2">Soal #{a.question_id}</div>
                    <div className="text-sm mb-3 text-[var(--text-h)]">{a.question.prompt}</div>
                    <div className="p-3 rounded bg-[var(--code-bg)] mb-3">
                      <div className="text-xs font-medium mb-1 opacity-70">Jawaban:</div>
                      <pre className="text-sm whitespace-pre-wrap font-mono">{a.answer?.text ?? '-'}</pre>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm">Nilai:</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={scores[a.question_id] ?? 0}
                        onChange={(e) => setScores((s) => ({ ...s, [a.question_id]: Number(e.target.value) }))}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {msg && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${msg.includes('Tersimpan') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {msg}
                </div>
              )}

              <button
                onClick={submitGrades}
                disabled={loading || essayAnswers.length === 0}
                className="mt-4 px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan & Finalisasi'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}