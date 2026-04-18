import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser, getCachedToken } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

interface Exam {
  id: number
  title: string
  description: string | null
  duration_seconds: number | null
  status: string
}

interface ExamResult {
  user_id: number
  user: { id: number; name: string; username: string; email: string }
  best_score: number
  max_score: number
  correct_count: number
  incorrect_count: number
  percentage: number
  attempts_count: number
  submitted_at: string | null
  rank: number
}

interface ExamResultResponse {
  data: ExamResult[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

interface Question {
  id: number
  question: string
  type: string
  options: string[] | null
  answer: string | null
}

export default function ReportsPage() {
  const user = getCachedUser()
  const can = user?.roles?.includes('admin') || user?.roles?.includes('guru') || user?.roles?.includes('viewer')
  const { examId } = useParams()

  const [exam, setExam] = useState<Exam | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [results, setResults] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(10)
  
  // Detail modal
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null)
  const [detailAnswers, setDetailAnswers] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchResults = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      })
      const res = await api.get(`/exams/${examId}/reports/results?${params}`)
      const data = res.data as ExamResultResponse
      setResults(data.data || [])
      setLastPage(data.last_page || 1)
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rExam, rSummary, rItems, rQuestions] = await Promise.all([
        api.get(`/exams/${examId}`),
        api.get(`/exams/${examId}/analytics/summary`),
        api.get(`/exams/${examId}/analytics/item-analysis`),
        api.get(`/exams/${examId}/questions`),
      ])
      setExam(rExam.data)
      setSummary(rSummary.data?.summary ?? null)
      setItems(rItems.data?.items ?? [])
      setQuestions(rQuestions.data?.data || [])
      await fetchResults()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!can || !examId) return
    fetchData()
  }, [can, examId])

  useEffect(() => {
    if (!can || !examId) return
    fetchResults()
  }, [can, examId, page, perPage])

  const openDetail = async (result: ExamResult) => {
    setSelectedResult(result)
    setDetailLoading(true)
    try {
      // Fetch attempts for this user
      const res = await api.get(`/exams/${examId}/reports/results?user_id=${result.user_id}`)
      const attempts = res.data?.data || []
      
      // Get answers from the best attempt
      const bestAttempt = attempts.find((a: any) => a.id) || attempts[0]
      if (bestAttempt?.answers) {
        setDetailAnswers(bestAttempt.answers)
      } else {
        setDetailAnswers([])
      }
    } catch (e) {
      console.error(e)
      setDetailAnswers([])
    } finally {
      setDetailLoading(false)
    }
  }

  if (!can) {
    return (
      <AdminLayout title="Reports">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin, guru, dan viewer yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Reports">
      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <a
          href={`${import.meta.env.VITE_API_URL}/exams/${examId}/reports/export.xlsx?token=${getCachedToken()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border rounded-lg text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          📥 Export Excel
        </a>
        <a
          href={`${import.meta.env.VITE_API_URL}/exams/${examId}/reports/export.pdf?token=${getCachedToken()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border rounded-lg text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          📄 Export PDF
        </a>
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-60">Loading...</div>
      ) : (
        <>
          {/* Exam Info */}
          {exam && (
            <div className="border rounded-lg p-4 mb-6 bg-[var(--bg)]">
              <h2 className="text-lg font-semibold mb-2">{exam.title}</h2>
              <div className="flex flex-wrap gap-4 text-sm opacity-70">
                <span>Durasi: {exam.duration_seconds ? `${Math.round(exam.duration_seconds / 60)} menit` : '-'}</span>
                <span>Status: {exam.status}</span>
                <span>Soal: {questions.length}</span>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Total Peserta</div>
                <div className="text-2xl font-semibold">{summary.total_attempts ?? 0}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Rata-rata</div>
                <div className="text-2xl font-semibold">{typeof summary.avg_score === 'number' ? summary.avg_score.toFixed(0) : '-'}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Tertinggi</div>
                <div className="text-2xl font-semibold">{summary.max_score ?? '-'}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs uppercase tracking-wider opacity-70 mb-1">Terendah</div>
                <div className="text-2xl font-semibold">{summary.min_score ?? '-'}</div>
              </div>
            </div>
          )}

          {/* Ranking with Pagination */}
          <div className="border rounded-lg p-4 mb-6 bg-[var(--bg)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">Ranking</h3>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(parseInt(e.target.value)); setPage(1) }}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            {results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Rank</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Peserta</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Benar</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Salah</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Score</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.user_id} className="hover:bg-[var(--social-bg)]">
                        <td className="px-3 py-2 border-b">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-semibold">
                            {r.rank}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-b">
                          <div className="font-medium">{r.user?.name}</div>
                          <div className="text-xs opacity-60">@{r.user?.username}</div>
                        </td>
                        <td className="px-3 py-2 border-b text-green-600 font-medium">{r.correct_count ?? 0}</td>
                        <td className="px-3 py-2 border-b text-red-600">{r.incorrect_count ?? 0}</td>
                        <td className="px-3 py-2 border-b font-semibold">{r.percentage ?? 0}</td>
                        <td className="px-3 py-2 border-b">
                          <button
                            onClick={() => openDetail(r)}
                            className="px-2 py-1 text-xs border rounded hover:border-[var(--accent)]"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 opacity-60">Data ranking tidak tersedia</div>
            )}

            {/* Pagination */}
            {!loading && total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t">
                <div className="text-sm opacity-70">
                  Menampilkan {(page - 1) * perPage + 1} - {Math.min(page * perPage, total)} dari {total}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 border rounded text-sm disabled:opacity-50">««</button>
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-2 py-1 border rounded text-sm disabled:opacity-50">«</button>
                  <span className="px-2 py-1 text-sm">Hal {page} / {lastPage}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page === lastPage} className="px-2 py-1 border rounded text-sm disabled:opacity-50">»</button>
                  <button onClick={() => setPage(lastPage)} disabled={page === lastPage} className="px-2 py-1 border rounded text-sm disabled:opacity-50">»»</button>
                </div>
              </div>
            )}
          </div>

          {/* Item Analysis */}
          <div className="border rounded-lg p-4 bg-[var(--bg)]">
            <h3 className="font-semibold mb-4">Item Analysis (P-Value)</h3>
            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Soal</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Type</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">n</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Benar</th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">P-Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.question_id} className="hover:bg-[var(--social-bg)]">
                        <td className="px-3 py-2 border-b font-medium">Q{it.question_id}</td>
                        <td className="px-3 py-2 border-b">{it.type}</td>
                        <td className="px-3 py-2 border-b">{it.n}</td>
                        <td className="px-3 py-2 border-b">{it.correct}</td>
                        <td className="px-3 py-2 border-b">{typeof it.p_value === 'number' ? it.p_value.toFixed(0) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 opacity-60">Data item analysis tidak tersedia</div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedResult(null)}>
          <div className="bg-[var(--bg)] rounded-lg p-4 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Detail: {selectedResult.user?.name}</h3>
              <button onClick={() => setSelectedResult(null)} className="text-2xl">&times;</button>
            </div>
            <div className="mb-4 text-sm">
              <span className="font-medium">Score: </span>
              <span>{selectedResult.percentage}</span>
              <span className="mx-2">|</span>
              <span className="text-green-600">Benar: {selectedResult.correct_count}</span>
              <span className="mx-2">|</span>
              <span className="text-red-600">Salah: {selectedResult.incorrect_count}</span>
            </div>
            {detailLoading ? (
              <div className="text-center py-4 opacity-60">Loading...</div>
            ) : detailAnswers.length > 0 ? (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {detailAnswers.map((answer: any, idx: number) => (
                  <div key={idx} className={`p-3 border rounded ${answer.type === 'essay' ? 'bg-amber-50 border-amber-300' : answer.is_correct ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium">Q{idx + 1}</div>
                      {answer.type === 'essay' ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-200 text-amber-800">
                          Point: {answer.score_awarded ?? 0}
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${answer.is_correct ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                          {answer.is_correct ? 'Benar' : 'Salah'}
                        </span>
                      )}
                    </div>
                    {/* Question */}
                    {answer.question && (
                      <div className="text-sm mt-1 opacity-80">{answer.question}</div>
                    )}
                    {/* User's Answer */}
                    <div className="text-xs mt-2">
                      <span className="font-medium">Jawaban Saya: </span>
                      <span className={answer.type === 'essay' ? 'text-amber-700' : answer.is_correct ? 'text-green-700' : 'text-red-700'}>
                        {typeof answer.answer === 'object' ? answer.answer?.choice || answer.answer?.text || answer.answer?.join(', ') : answer.answer || '(kosong)'}
                      </span>
                    </div>
                    {/* Correct Answer */}
                    {answer.correct_answer && !answer.is_correct && (
                      <div className="text-xs mt-1">
                        <span className="font-medium text-green-700">Jawaban Benar: </span>
                        <span className="text-green-700">
                          {typeof answer.correct_answer === 'object' ? answer.correct_answer?.choice || answer.correct_answer?.text || answer.correct_answer?.join(', ') : answer.correct_answer}
                        </span>
                      </div>
                    )}
                    {/* Explanation */}
                    {answer.explanation && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <div className="font-medium text-blue-800">Pembahasan:</div>
                        <div className="text-blue-700 mt-1">{answer.explanation}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 opacity-60">Tidak ada data jawaban</div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}