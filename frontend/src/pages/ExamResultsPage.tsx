import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import AdminLayout from '../lib/AdminLayout'

type UserInfo = {
  id: number
  name: string
  username: string
  email: string
}

type Answer = {
  question_id: number
  question: string
  type: string
  options: string[]
  answer: string
  correct_answer: string
  explanation: string
  is_correct: boolean
}

type ExamResult = {
  user_id: number
  user: UserInfo
  best_score: number
  max_score: number
  correct_count: number
  incorrect_count: number
  percentage: number
  attempts_count: number
  submitted_at: string
  best_attempt_id: number
  answers: Answer[]
  rank: number
}

type ExamResultsResponse = {
  data: ExamResult[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type ExamInfo = {
  id: number
  title: string
}

export default function ExamResultsPage() {
  const { examId } = useParams()
  const [data, setData] = useState<ExamResultsResponse | null>(null)
  const [exam, setExam] = useState<ExamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<ExamResult | null>(null)
  
  // Pagination for detail jawaban
  const [detailPage, setDetailPage] = useState(1)
  const perPage = 5

  useEffect(() => {
    if (!examId) return
    setLoading(true)
    api.get(`/exams/${examId}/reports/results`)
      .then(r => {
        setData(r.data)
        setExam(r.data.exam)
      })
      .catch(err => {
        setError(err?.response?.data?.message || 'Gagal memuat hasil')
      })
      .finally(() => setLoading(false))
  }, [examId])

  const stats = useMemo(() => {
    if (!data?.data) return null
    const scores = data.data.map(r => r.percentage)
    return {
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      highest: Math.max(...scores, 0),
      lowest: Math.min(...scores, 0),
      total: data.data.length
    }
  }, [data])

  if (loading) {
    return (
      <AdminLayout title="Hasil Ujian">
        <div className="text-center py-12 opacity-60">Memuat hasil...</div>
      </AdminLayout>
    )
  }

  if (error || !data) {
    return (
      <AdminLayout title="Hasil Ujian">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">😕</div>
          <p className="mb-4">{error || 'Tidak ada hasil ditemukan'}</p>
          <Link to="/exams" className="text-[var(--accent)] hover:underline">
            Kembali ke Daftar Ujian
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Hasil Ujian">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/exams" 
            className="text-sm text-[var(--accent)] hover:underline mb-2 inline-block"
          >
            ← Kembali ke Daftar Ujian
          </Link>
          <h1 className="text-2xl font-bold">{exam?.title || 'Hasil Ujian'}</h1>
          <p className="text-sm opacity-75">{data.total} peserta</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 border rounded-lg bg-[var(--bg)] text-center">
              <div className="text-2xl font-bold text-[var(--accent)]">{stats.avg}</div>
              <div className="text-sm opacity-75">Rata-rata</div>
            </div>
            <div className="p-4 border rounded-lg bg-[var(--bg)] text-center">
              <div className="text-2xl font-bold text-green-600">{stats.highest}</div>
              <div className="text-sm opacity-75">Tertinggi</div>
            </div>
            <div className="p-4 border rounded-lg bg-[var(--bg)] text-center">
              <div className="text-2xl font-bold text-red-600">{stats.lowest}</div>
              <div className="text-sm opacity-75">Terendah</div>
            </div>
            <div className="p-4 border rounded-lg bg-[var(--bg)] text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm opacity-75">Peserta</div>
            </div>
          </div>
        )}

        {/* Ranking Table */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--bg)]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Peringkat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Peserta</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Skor</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Benar</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Salah</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((result) => (
                <tr key={result.user_id} className="border-t">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      result.rank <= 3 
                        ? result.rank === 1 ? 'bg-yellow-100 text-yellow-700' 
                          : result.rank === 2 ? 'bg-gray-100 text-gray-700'
                            : 'bg-orange-100 text-orange-700'
                        : 'bg-gray-50 text-gray-600'
                    }`}>
                      {result.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{result.user.name}</div>
                    <div className="text-sm opacity-75">{result.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold">{result.best_score}</span>
                    <span className="text-sm opacity-75">/{result.max_score}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-green-600">{result.correct_count}</td>
                  <td className="px-4 py-3 text-center text-red-600">{result.incorrect_count}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedUser(result)}
                      className="text-[var(--accent)] hover:underline text-sm"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-[var(--bg)]">
                <div>
                  <h2 className="text-xl font-semibold">Detail Jawaban</h2>
                  <p className="text-sm opacity-75">{selectedUser.user.name} - Nilai: {selectedUser.percentage}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-2xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                <div className="text-sm text-gray-500 mb-3">
                  Menampilkan {(detailPage - 1) * perPage + 1} - {Math.min(detailPage * perPage, selectedUser.answers.length)} dari {selectedUser.answers.length} soal
                </div>
                {selectedUser.answers.length === 0 ? (
                  <p className="text-center py-8 opacity-75">Belum ada jawaban</p>
                ) : (
                  <div className="space-y-4">
                    {selectedUser.answers.slice((detailPage - 1) * perPage, detailPage * perPage).map((answer, i) => (
                      <div 
                        key={answer.question_id} 
                        className={`p-4 border rounded-lg ${
                          answer.is_correct 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-sm font-medium">Soal {((detailPage - 1) * perPage) + i + 1}</span>
                            <span className="text-xs ml-2 opacity-75">({answer.type})</span>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            answer.is_correct 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {answer.is_correct ? '✓ Benar' : '✗ Salah'}
                          </span>
                        </div>
                        <p className="text-sm mb-3">{answer.question}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="opacity-75 mb-1">Jawaban Peserta:</div>
                            <div className="font-medium">{answer.answer || '(tidak dijawab)'}</div>
                          </div>
                          <div>
                            <div className="opacity-75 mb-1">Jawaban Benar:</div>
                            <div className="font-medium text-green-600">{answer.correct_answer || '-'}</div>
                          </div>
                        </div>

                        {!answer.is_correct && answer.explanation && (
                          <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                            <span className="font-medium">Penjelasan:</span> {answer.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pagination Controls */}
                {selectedUser.answers.length > perPage && (
                  <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={() => setDetailPage(p => Math.max(1, p - 1))}
                      disabled={detailPage <= 1}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                      ← Prev
                    </button>
                    <span className="text-sm">
                      Halaman {detailPage} dari {Math.ceil(selectedUser.answers.length / perPage)}
                    </span>
                    <button
                      onClick={() => setDetailPage(p => Math.min(Math.ceil(selectedUser.answers.length / perPage), p + 1))}
                      disabled={detailPage >= Math.ceil(selectedUser.answers.length / perPage)}
                      className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}