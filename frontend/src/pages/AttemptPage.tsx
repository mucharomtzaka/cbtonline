import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'

// Matching Question Component with Select Dropdowns
function MatchingQuestion({ 
  question, 
  answer, 
  onAnswer,
  disabled 
}: { 
  question: Question; 
  answer: Record<number, number>; 
  onAnswer: (a: Record<number, number>) => void;
  disabled?: boolean;
}) {
  const pairs = question.options as [string[], string[]] | null
  if (!pairs || !pairs[0] || !pairs[1]) {
    return <div className="text-sm opacity-75">Tidak ada pasangan</div>
  }

  const sources = pairs[0] || []
  const targets = pairs[1] || []

  // Convert array to object if needed (backend may return array format)
  const normalizedAnswer: Record<number, number> = Array.isArray(answer)
    ? answer.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {})
    : answer

  function handleSelect(sourceIdx: number, targetIdx: number | null) {
    const newAnswer: Record<number, number> = {}
    if (targetIdx !== null) {
      newAnswer[sourceIdx] = targetIdx
    }
    // Copy other entries
    Object.entries(normalizedAnswer).forEach(([k, v]) => {
      if (Number(k) !== sourceIdx) {
        newAnswer[Number(k)] = v
      }
    })
    onAnswer(newAnswer)
  }

  // Get list of used target indices (excluding current selection)
  const usedTargets = new Set(
    Object.entries(normalizedAnswer)
      .filter(([k]) => k !== String(answer))
      .map(([, v]) => v)
      .filter(v => v != null)
  )

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium mb-3">{question.prompt}</div>
      <div className="space-y-2">
        {sources.map((sourceLabel, sourceIdx) => {
          const selectedTarget = normalizedAnswer[sourceIdx]
          
          return (
            <div key={sourceIdx} className="flex items-center gap-3 p-2 border rounded-lg">
              <div className="flex-1 font-medium">{sourceLabel}</div>
              <span className="text-gray-400">→</span>
              <select
                value={selectedTarget ?? ''}
                disabled={disabled}
                onChange={(e) => handleSelect(sourceIdx, e.target.value ? Number(e.target.value) : null)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Pilih...</option>
                {targets.map((targetLabel, targetIdx) => {
                  const isUsed = usedTargets.has(targetIdx) && selectedTarget !== targetIdx
                  return (
                    <option 
                      key={targetIdx} 
                      value={targetIdx}
                      disabled={isUsed}
                    >
                      {targetLabel}{isUsed ? ' (terpakai)' : ''}
                    </option>
                  )
                })}
              </select>
              {!disabled && selectedTarget != null && (
                <button 
                  onClick={() => handleSelect(sourceIdx, null)}
                  className="text-red-500 p-1 hover:bg-red-50 rounded"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type Question = {
  id: number
  type: 'multiple_choice' | 'multiple_choice_multiple' | 'essay' | 'true_false' | 'matching'
  prompt: string
  media_type?: string
  media_url?: string
  media_caption?: string
  options: any[] | null
  correct_answer?: any
  meta?: Record<string, any>
}

type AttemptPayload = {
  attempt: {
    id: number
    exam_id: number
    started_at: string
    duration_seconds: number | null
    max_score: number
    status: string
    score: number | null
  }
  exam: {
    id: number
    title: string
    description?: string
    duration_seconds: number | null
    auto_submit_on_timeout: boolean
    show_result_after_submit: boolean
    show_result_after_end: boolean
  }
  questions: Question[]
  answers?: { question_id: number; answer: any }[]
  results?: any[]
}

export default function AttemptPage() {
  const { attemptId } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState<AttemptPayload | null>(null)
  const [idx, setIdx] = useState(0)
  const [flagged, setFlagged] = useState<Record<number, boolean>>({})
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [remaining, setRemaining] = useState<number | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)
  const startedAtRef = useRef<number | null>(null)

  const current = useMemo(() => data?.questions[idx] ?? null, [data, idx])

  const totalQuestions = data?.questions.length ?? 0
  const answeredCount = Object.values(answers).filter(a => 
    a != null && (a.choice != null || a.value != null || a.text != null || (a.pairs && Object.keys(a.pairs).length > 0) || (a.choices && a.choices.length > 0))
  ).length

  useEffect(() => {
    if (!attemptId) return
    const raw = sessionStorage.getItem(`attempt:${attemptId}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AttemptPayload
        setData(parsed)
        if (parsed.answers) {
          const ans: Record<number, any> = {}
          parsed.answers.forEach(a => {
            ans[a.question_id] = a.answer
          })
          setAnswers(ans)
        }
        if (parsed.attempt.status === 'submitted') {
          setSubmitted(true)
          setResult(parsed.attempt)
        }
      } catch { setData(null) }
    } else {
      // Fetch from server
      api.get(`/attempts/${attemptId}`)
        .then((r) => {
          const payload = r.data as AttemptPayload
          setData(payload)
          sessionStorage.setItem(`attempt:${attemptId}`, JSON.stringify(payload))
          if (payload.answers) {
            const ans: Record<number, any> = {}
            payload.answers.forEach(a => {
              ans[a.question_id] = a.answer
            })
            setAnswers(ans)
          }
          if (payload.attempt.status === 'submitted') {
            setSubmitted(true)
            setResult(payload.attempt)
          }
        })
        .catch(() => setData(null))
    }
  }, [attemptId])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        logEvent('tab_switch', { visibilityState: document.visibilityState })
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  async function logEvent(type: string, payload?: Record<string, any>) {
    if (!attemptId) return
    try { await api.post(`/attempts/${attemptId}/events`, { type, payload }) } catch {}
  }

  useEffect(() => {
    if (!data?.attempt.duration_seconds) return
    // Don't start timer if already submitted
    if (data.attempt.status && data.attempt.status !== 'in_progress') {
      setRemaining(0)
      return
    }
    const started = Date.parse(data.attempt.started_at)
    if (isNaN(started)) return
    const deadline = started + data.attempt.duration_seconds * 1000
    startedAtRef.current = started
    let mounted = true
    let ticking = true
    const tick = () => {
      if (!mounted || !ticking) return
      const now = Date.now()
      const r = Math.max(0, Math.floor((deadline - now) / 1000))
      setRemaining(r)
      
      // Show warning at 5 minutes, 1 minute, 30 seconds, 10 seconds
      const warningTimes = [300, 60, 30, 10]
      if (warningTimes.includes(r)) {
        setShowWarning(true)
        setTimeout(() => setShowWarning(false), 3000)
      }
    }
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        tick()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    tick()
    const t = window.setInterval(tick, 1000)
    return () => {
      mounted = false
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [data?.attempt.duration_seconds])

  async function saveAnswer(questionId: number, answer: any) {
    if (!attemptId || submitted) return
    setAnswers((s) => ({ ...s, [questionId]: answer }))
    try {
      await api.put(`/attempts/${attemptId}/answer`, { question_id: questionId, answer })
    } catch (e: any) {
      // If attempt already submitted, handle gracefully
      if (e.response?.status === 422 && e.response?.data?.message?.includes('sudah')) {
        setSubmitted(true)
        window.location.reload()
      }
    }
  }

  // Auto-submit when remaining hits 0
  useEffect(() => {
    if (remaining === 0 && !submitted && (!data?.attempt.status || data?.attempt.status === 'in_progress')) {
      doSubmit()
    }
  }, [remaining])

  async function doSubmit() {
    if (!attemptId || submitted) return
    setSubmitted(true)
    try {
      const res = await api.post(`/attempts/${attemptId}/submit`)
      setResult(res.data.attempt)
      const results = res.data.results || []
      // Update session storage
      const raw = sessionStorage.getItem(`attempt:${attemptId}`)
      if (raw) {
        const parsed = JSON.parse(raw) as AttemptPayload
        parsed.attempt.status = 'submitted'
        parsed.attempt.score = res.data.attempt?.score
        parsed.results = results
        sessionStorage.setItem(`attempt:${attemptId}`, JSON.stringify(parsed))
      }
    } catch (e: any) {
      // If attempt already submitted, handle gracefully
      if (e.response?.status === 422 && e.response?.data?.message?.includes('sudah')) {
        setSubmitted(true)
        window.location.reload()
      } else {
        setSubmitted(false)
      }
    }
  }

  function goToQuestion(i: number) {
    setIdx(i)
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto p-4 mt-12 text-center">
        <h2 className="text-xl font-semibold mb-4">Attempt #{attemptId}</h2>
        <p className="opacity-75 mb-6">Halaman ini dibuat untuk navigasi dari tombol Start. Kalau kamu refresh, payload soal belum di-load lagi.</p>
        <button onClick={() => nav('/', { replace: true })} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg">
          Kembali
        </button>
      </div>
    )
  }

  // Show result after submit
  if (submitted && result) {
    const results = data?.results || []
    const correctCount = results.filter((r: any) => r.is_correct).length
    
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="p-6 border rounded-xl bg-[var(--bg)] text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Ujian Selesai</h2>
          <p className="text-lg mb-6">{data.exam.title}</p>
          
          {data.exam.show_result_after_submit && (
            <div className="p-6 bg-[var(--social-bg)] rounded-lg mb-6">
              <div className="text-4xl font-bold text-[var(--accent)] mb-2">
                {result.score ?? 0}
              </div>
              <div className="text-sm opacity-75">
                dari {data.attempt.max_score} poin
              </div>
              {result.score != null && (
                <div className="mt-2 text-sm">
                  Nilai: {Math.round((result.score / data.attempt.max_score) * 100)}
                </div>
              )}
              <div className="mt-2 text-sm text-green-600">
                {correctCount} benar, {results.length - correctCount} salah
              </div>
            </div>
          )}

          <button onClick={() => nav('/', { replace: true })} className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium">
            Kembali ke Dashboard
          </button>
        </div>

        {/* Detailed Results */}
        {data.exam.show_result_after_submit && results.length > 0 && (
          <div className="border rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4">DetailJawaban</h3>
            {results.map((r: any, i: number) => {
              const userIdx = r.answer?.choice
              const correctIdx = r.question?.correct_answer
              return (
              <div key={r.question_id} className={`p-4 border rounded-lg mb-3 ${r.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium">Soal {i + 1}</span>
                  <span className={`px-2 py-0.5 text-xs rounded ${r.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.is_correct ? '✓ Benar' : '✗ Salah'}
                  </span>
                </div>
                <p className="text-sm mb-2">{r.question?.prompt}</p>
                <div className="text-sm">
                  <div className="opacity-75">Jawaban Anda:</div>
                  {r.question?.type === 'multiple_choice' && (
                    <div className="font-medium">
                      {userIdx != null && r.question.options?.[userIdx] ? r.question.options[userIdx] : '(tidak dijawab)'}
                    </div>
                  )}
                  {r.question?.type === 'true_false' && (
                    <div className="font-medium">
                      {r.answer?.value != null ? (r.answer.value ? 'True' : 'False') : '(tidak dijawab)'}
                    </div>
                  )}
                  {r.question?.type === 'essay' && (
                    <div className="font-medium">{r.answer?.text || '(tidak dijawab)'}</div>
                  )}
                </div>
                <div className="text-sm mt-2">
                  <div className="opacity-75">Jawaban Benar:</div>
                  {r.question?.type === 'multiple_choice' && (
                    <div className="font-medium text-green-700">
                      {correctIdx != null && r.question.options?.[correctIdx] ? r.question.options[correctIdx] : '-'}
                    </div>
                  )}
                  {r.question?.type === 'true_false' && (
                    <div className="font-medium text-green-700">
                      {r.question.correct_answer != null ? (r.question.correct_answer ? 'True' : 'False') : '-'}
                    </div>
                  )}
                  {r.question?.type === 'essay' && (
                    <div className="font-medium text-green-700">-</div>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    )
  }

return (
    <div className="max-w-6xl mx-auto p-4 pb-24 lg:pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-h)]">{data.exam.title}</h3>
          <div className="text-sm opacity-75">Soal {idx + 1}/{totalQuestions} • {answeredCount} terjawab</div>
        </div>
        <div className="flex items-center gap-4">
          {remaining != null ? (
            <div className={`text-sm font-medium ${remaining <= 60 ? 'text-red-600 animate-pulse' : remaining <= 300 ? 'text-orange-600' : ''}`}>
              Timer: {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
            </div>
          ) : (
            <div className="text-sm opacity-75">Tanpa timer</div>
          )}
          
          {/* Warning Toast */}
          {showWarning && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce z-50">
              ⚠️ Waktu tinggal {remaining} detik! Segera submit jawabanmu!
            </div>
          )}
          <button onClick={doSubmit} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium">
            Submit
          </button>
        </div>
      </div>

      {/* Mobile Navigation - Bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-between items-center gap-2 shadow-lg">
        <div className="flex gap-1 overflow-x-auto">
          {data.questions.slice(0, 10).map((q, i) => {
            const ans = answers[q.id]
            const isAnswered = ans != null && (ans.choice != null || ans.value != null || ans.text != null || (ans.pairs && Object.keys(ans.pairs).length > 0) || (ans.choices && ans.choices.length > 0))
            const isCurrent = i === idx
            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(i)}
                className={`w-8 h-8 rounded text-xs font-medium border flex-shrink-0 ${
                  isCurrent
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : isAnswered
                    ? 'border-green-400 bg-green-100'
                    : 'border-gray-300'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
          {totalQuestions > 10 && <span className="text-xs opacity-50">+{totalQuestions - 10}</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => goToQuestion(Math.max(0, idx - 1))}
            disabled={idx === 0}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm font-medium">{idx + 1}/{totalQuestions}</span>
          <button
            onClick={() => goToQuestion(Math.min(totalQuestions - 1, idx + 1))}
            disabled={idx === totalQuestions - 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Main Layout: Question + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Question Area - Responsive width */}
        <div className="w-full lg:w-[672px]">
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((idx + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Question */}
          {current && (
            <div className="p-5 border rounded-lg mb-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-[var(--accent)] px-2 py-1 bg-[var(--accent-bg)] rounded">{current.type}</span>
                <button
                  onClick={() => setFlagged((s) => ({ ...s, [current.id]: !s[current.id] }))}
                  className={`text-sm px-3 py-1 rounded border ${flagged[current.id] ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}`}
                >
                  {flagged[current.id] ? '★ Flagged' : '☆ Flag'}
                </button>
              </div>
              
              <p className="whitespace-pre-wrap text-[var(--text-h)] mb-6">{current.prompt}</p>

              {/* Media Display */}
              {current.media_url && (
                <div className="mb-4 p-3 border rounded-lg bg-[var(--social-bg)]">
                  {current.media_type === 'image' && (
                    <img src={current.media_url} alt="" className="max-h-64 mx-auto rounded border" />
                  )}
                  {current.media_type === 'audio' && (
                    <audio controls src={current.media_url} className="w-full h-12" />
                  )}
                  {current.media_type === 'video' && (
                    <video controls src={current.media_url} className="max-h-64 mx-auto rounded border" />
                  )}
                  {current.media_caption && (
                    <div className="text-xs text-center mt-2 text-[var(--text)]">{current.media_caption}</div>
                  )}
                </div>
              )}

              {/* Multiple Choice */}
              {current.type === 'multiple_choice' && Array.isArray(current.options) && (
                <div className="space-y-2">
                  {current.options.map((opt, i) => {
                    const label = String(opt?.label ?? opt ?? i)
                    const selected = answers[current.id]?.choice === i
                    return (
                      <label
                        key={i}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selected ? 'border-[var(--accent)] bg-[var(--accent-bg)]' : 'hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${current.id}`}
                          checked={selected}
                          onChange={() => saveAnswer(current.id, { choice: i })}
                          className="w-4 h-4"
                        />
                        <span>{label}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Multiple Choice Multiple (checkboxes) */}
              {current.type === 'multiple_choice_multiple' && Array.isArray(current.options) && (
                <div className="space-y-2">
                  {current.options.map((opt, i) => {
                    const label = String(opt?.label ?? opt ?? i)
                    const selectedChoices = answers[current.id]?.choices ?? []
                    const isSelected = selectedChoices.includes(i)
                    return (
                      <label
                        key={i}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-[var(--accent)] bg-[var(--accent-bg)]' : 'hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const currentChoices = answers[current.id]?.choices ?? []
                            const newChoices = e.target.checked
                              ? [...currentChoices, i]
                              : currentChoices.filter((c: number) => c !== i)
                            saveAnswer(current.id, { choices: newChoices })
                          }}
                          className="w-4 h-4"
                        />
                        <span>{label}</span>
                      </label>
                    )
                  })}
                  <div className="text-xs text-gray-500 mt-2">
                    * Bisa pilih lebih dari satu jawaban
                  </div>
                </div>
              )}

              {/* True/False */}
              {current.type === 'true_false' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => saveAnswer(current.id, { value: true })}
                    className={`px-4 py-2 rounded-lg border ${answers[current.id]?.value === true ? 'border-[var(--accent)] bg-[var(--accent-bg)]' : ''}`}
                  >
                    True
                  </button>
                  <button
                    onClick={() => saveAnswer(current.id, { value: false })}
                    className={`px-4 py-2 rounded-lg border ${answers[current.id]?.value === false ? 'border-[var(--accent)] bg-[var(--accent-bg)]' : ''}`}
                  >
                    False
                  </button>
                </div>
              )}

              {/* Essay */}
              {current.type === 'essay' && (
                <textarea
                  value={answers[current.id]?.text ?? ''}
                  onChange={(e) => saveAnswer(current.id, { text: e.target.value })}
                  className="w-full p-3 border rounded-lg text-sm"
                  rows={4}
                  placeholder="Tulis jawaban..."
                />
              )}

              {/* Matching */}
              {current.type === 'matching' && (() => {
                const rawPairs = answers[current.id]?.pairs
                const normalizedPairs: Record<number, number> = Array.isArray(rawPairs)
                  ? rawPairs.reduce((acc, val, idx) => ({ ...acc, [idx]: val }), {})
                  : (rawPairs ?? {})
                return (
                  <MatchingQuestion
                    question={current}
                    answer={normalizedPairs}
                    onAnswer={(pairs) => saveAnswer(current.id, { pairs })}
                    disabled={submitted}
                  />
                )
              })()}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3">
            <button
              onClick={() => goToQuestion(Math.max(0, idx - 1))}
              disabled={idx === 0}
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <button
              onClick={() => goToQuestion(Math.min(totalQuestions - 1, idx + 1))}
              disabled={idx === totalQuestions - 1}
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right Navigation Sidebar (Desktop) */}
        <div className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-24">
            <div className="text-sm font-medium mb-2">Navigasi Soal</div>
            <div className="grid grid-cols-4 gap-2">
              {data.questions.map((q, i) => {
                const ans = answers[q.id]
                const isAnswered = ans != null && (ans.choice != null || ans.value != null || ans.text != null || (ans.pairs && Object.keys(ans.pairs).length > 0) || (ans.choices && ans.choices.length > 0))
                const isFlagged = flagged[q.id]
                const isCurrent = i === idx
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(i)}
                    className={`w-9 h-9 rounded text-xs font-medium border transition-colors ${
                      isCurrent
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : isAnswered
                        ? 'border-green-400 bg-green-100 text-green-700'
                        : isFlagged
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-1 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded bg-green-100 border border-green-400"></div>
                <span>✓ Terjawab</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded bg-yellow-50 border border-yellow-400"></div>
                <span>⚑ Flag</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}