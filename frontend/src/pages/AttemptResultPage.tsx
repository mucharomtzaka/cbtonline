import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import AdminLayout from '../lib/AdminLayout'

type Question = {
  id: number
  type: string
  prompt: string
  options: any[]
  answer: any
  correct_answer: string
  is_correct: boolean | null
  score_awarded?: number | null
  explanation?: string
}

type AttemptResult = {
  attempt: {
    id: number
    score: number
    max_score: number
    submitted_at: string
  }
  exam: {
    id: number
    title: string
    show_result_after_submit: boolean
  }
  questions: Question[]
}

export default function AttemptResultPage() {
  const { examId } = useParams()
  const [data, setData] = useState<AttemptResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 5

  useEffect(() => {
    if (!examId) return
    setLoading(true)
    api.get(`/exams/${examId}/my-result`)
      .then(r => setData(r.data))
      .catch(err => {
        setError(err?.response?.data?.message || 'Gagal memuat hasil')
      })
      .finally(() => setLoading(false))
  }, [examId])

  const correctCount = useMemo(() => {
    return data?.questions.filter(q => q.is_correct).length ?? 0
  }, [data])

  const incorrectCount = useMemo(() => {
    return data?.questions.filter(q => q.is_correct === false).length ?? 0
  }, [data])

  const percentage = useMemo(() => {
    if (!data?.attempt.max_score) return 0
    return Math.min(100, Math.round((data.attempt.score / data.attempt.max_score) * 100))
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
          <Link to="/" className="text-[var(--accent)] hover:underline">
            Kembali ke Dashboard
          </Link>
        </div>
      </AdminLayout>
    )
  }

  const hasQuestions = data.questions.length > 0
  const totalPages = Math.ceil(data.questions.length / perPage)
  const startIdx = (currentPage - 1) * perPage
  const pagedQuestions = data.questions.slice(startIdx, startIdx + perPage)

  return (
    <AdminLayout title="Hasil Ujian">
      <div className="max-w-2xl mx-auto">
        <div className="p-6 border rounded-xl bg-[var(--bg)] text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Ujian Selesai</h2>
          <p className="text-lg mb-6">{data.exam.title}</p>
          
          <div className="p-6 bg-[var(--social-bg)] rounded-lg mb-6">
            <div className="text-4xl font-bold text-[var(--accent)] mb-2">
              {data.attempt.score}
            </div>
            <div className="text-sm opacity-75">
              dari {data.attempt.max_score} poin
            </div>
            {data.attempt.max_score > 0 && (
              <div className="mt-2 text-lg font-semibold">
                Nilai: {percentage}
              </div>
            )}
            {(correctCount > 0 || incorrectCount > 0) && (
              <div className="mt-2 text-sm">
                <span className="text-green-600">✓ {correctCount} benar</span>
                {' / '}
                <span className="text-red-600">✗ {incorrectCount} salah</span>
              </div>
            )}
          </div>

          <Link
            to="/"
            className="inline-block px-4 py-2 border rounded-lg hover:border-[var(--accent)]"
          >
            Kembali ke Dashboard
          </Link>
        </div>

        {hasQuestions && (
          <div className="border rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4">Detail Jawaban</h3>
            
            <div className="text-sm text-gray-500 mb-3">
              Menampilkan {startIdx + 1} - {Math.min(startIdx + perPage, data.questions.length)} dari {data.questions.length} soal
            </div>
            
            {pagedQuestions.map((q, i) => {
              let userAnswerText = ''
              if (q.type === 'multiple_choice') {
                const idx = q.answer?.choice
                userAnswerText = idx != null && q.options?.[idx] ? q.options[idx] : '(tidak dijawab)'
              } else if (q.type === 'multiple_choice_multiple') {
                userAnswerText = q.answer?.choices?.length
                  ? q.answer.choices.map((c: number) => q.options[c] ?? c).join(', ')
                  : '(tidak dijawab)'
              } else if (q.type === 'true_false') {
                userAnswerText = q.answer?.value != null ? (q.answer.value ? 'True' : 'False') : '(tidak dijawab)'
              } else if (q.type === 'essay') {
                userAnswerText = q.answer?.text || '(tidak dijawab)'
              } else if (q.type === 'matching') {
                const pairs = q.answer?.pairs
                const normalizedPairs = Array.isArray(pairs)
                  ? pairs.reduce((acc: Record<number, number>, val: number, idx: number) => ({ ...acc, [idx]: val }), {})
                  : pairs
                userAnswerText = normalizedPairs
                  ? Object.entries(normalizedPairs).map(([k, v]) => `${q.options[0]?.[Number(k)] ?? k} → ${q.options[1]?.[Number(v)] ?? v}`).join('; ')
                  : '(tidak dijawab)'
              } else {
                userAnswerText = JSON.stringify(q.answer) || '(tidak dijawab)'
              }

              const globalIdx = startIdx + i

              return (
                <div key={q.id} className={`p-4 border rounded-lg mb-3 ${q.type === 'essay' ? 'bg-amber-50 border-amber-200' : q.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Soal {globalIdx + 1}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{q.type}</span>
                    </div>
                    {q.type === 'essay' ? (
                      <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">
                        Skor: {q.score_awarded ?? 0}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 text-xs rounded ${q.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {q.is_correct ? '✓ BENAR' : '✗ SALAH'}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm mb-3 font-medium">{q.prompt}</p>
                  
                  {q.type === 'multiple_choice' && q.options?.length > 0 && (
                    <div className="text-sm mb-3 space-y-1">
                      {q.options.map((opt: string, idx: number) => (
                        <div key={idx} className={`px-2 py-1 rounded ${idx === q.answer?.choice ? 'bg-blue-100 border-blue-300' : 'bg-gray-50'}`}>
                          {idx + 1}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <div className="opacity-75 mb-1">Jawaban Anda:</div>
                      <div className="font-medium text-blue-700">{userAnswerText}</div>
                    </div>
                    <div>
                      <div className="opacity-75 mb-1">Jawaban Benar:</div>
                      <div className="font-medium text-green-700">{q.correct_answer || '-'}</div>
                    </div>
                  </div>
                  
                  {q.explanation && (
                    <div className="mt-2 pt-2 border-t text-sm text-gray-600">
                      <span className="font-medium">Penjelasan:</span> {q.explanation}
                    </div>
                  )}
                </div>
              )
            })}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  ← Prev
                </button>
                <span className="text-sm">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}