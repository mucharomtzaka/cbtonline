import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Question = {
  id: number
  question: string
  question_type: string
  options: string[]
  correct_answer: number | string
}

type Exam = {
  id: number
  title: string
}

type ExamQuestion = {
  id: number
  question: Question
  order: number
}

export default function ExamQuestionsPage() {
  const user = getCachedUser()
  const canAccess = user?.roles?.includes('admin') || user?.roles?.includes('guru')
  const { examId } = useParams()

  const [exam, setExam] = useState<Exam | null>(null)
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const [bankResults, setBankResults] = useState<any[]>([])
  const [selectedBank, setSelectedBank] = useState<any>(null)
  const [bankQuestions, setBankQuestions] = useState<Question[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!canAccess || !examId) return
    Promise.all([
      api.get(`/exams/${examId}`),
      api.get(`/exams/${examId}/questions`)
    ]).then(([e, q]) => {
      setExam(e.data.exam)
      setExamQuestions(q.data.data ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [canAccess, examId])

  useEffect(() => {
    if (!bankSearch || bankSearch.length < 2) {
      setBankResults([])
      return
    }
    const timer = setTimeout(() => {
      api.get(`/question-banks?search=${bankSearch}`).then((r) => setBankResults(r.data.data ?? [])).catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [bankSearch])

  useEffect(() => {
    if (!selectedBank) {
      setBankQuestions([])
      return
    }
    let url = `/question-banks/${selectedBank.id}/questions?per_page=200`
    if (typeFilter) url += `&type=${typeFilter}`
    api.get(url).then((r) => {
      setBankQuestions(r.data.data ?? [])
    }).catch(() => {})
  }, [selectedBank, typeFilter])

  function toggleQuestion(qId: number) {
    setSelectedQuestions(prev => 
      prev.includes(qId) 
        ? prev.filter(id => id !== qId)
        : [...prev, qId]
    )
  }

  function selectAll() {
    setSelectedQuestions(bankQuestions.map(q => q.id))
  }

  function deselectAll() {
    setSelectedQuestions([])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBank || selectedQuestions.length === 0 || !examId) return
    setSaving(true)
    try {
      await api.post(`/exams/${examId}/questions`, { 
        question_ids: selectedQuestions 
      })
      setShowForm(false)
      setSelectedBank(null)
      setBankSearch('')
      setBankResults([])
      setSelectedQuestions([])
      const q = await api.get(`/exams/${examId}/questions`)
      setExamQuestions(q.data.data ?? [])
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal menambahkan soal')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: number) {
    if (!confirm('Yakin hapus soal ini dari ujian?')) return
    try {
      await api.delete(`/exams/${examId}/questions/${id}`)
      setExamQuestions(examQuestions.filter(eq => eq.id !== id))
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal hapus soal')
    }
  }

  async function handleResetAll() {
    if (!confirm('Yakin RESET semua soal di ujian ini? Semua soal akan dihapus.')) return
    if (!examId || examQuestions.length === 0) return
    setSaving(true)
    try {
      // Delete all questions one by one
      for (const eq of examQuestions) {
        await api.delete(`/exams/${examId}/questions/${eq.id}`)
      }
      setExamQuestions([])
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal reset soal')
    } finally {
      setSaving(false)
    }
  }

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      multiple_choice: 'Pilihan ganda',
      multiple_choice_multiple: 'Pilihan Ganda Kompleks',
      essay: 'Essay',
      true_false: 'True/False',
      matching: 'Matching'
    }
    return labels[type] || type
  }

  function getAnswerDisplay(question: Question) {
    const type = question.question_type
    const answer = question.correct_answer
    const options = question.options
    
    if (answer === null || answer === undefined) {
      return '-'
    }

    if (type === 'multiple_choice' || type === 'true_false') {
      const idx = Number(answer)
      if (Array.isArray(options) && options[idx] !== undefined) {
        return options[idx]
      }
      return String(answer)
    }

    if (type === 'multiple_choice_multiple') {
      if (Array.isArray(answer)) {
        return answer.map((i: number) => options[i] ?? i).join(', ')
      }
      return String(answer)
    }

    if (type === 'matching') {
      if (Array.isArray(answer) && Array.isArray(options) && options[0] && options[1]) {
        return answer.map((v: number, i: number) => {
          const source = options[0][i] ?? `[${i}]`
          const target = options[1][v] ?? `[${v}]`
          return `${source} → ${target}`
        }).join('; ')
      }
      return String(answer)
    }

    if (type === 'essay') {
      return '-'
    }

    return String(answer)
  }

  if (!canAccess) {
    return (
      <AdminLayout title="Soal Ujian">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin dan guru yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={`Soal Ujian #${examId}`}>
      <div className="mb-4">
        <Link to="/exams" className="text-[var(--accent)] hover:underline">← Kembali ke Ujian</Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold m-0">Soal Ujian</h3>
          <p className="text-sm text-[var(--text)] opacity-75">{exam?.title}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleResetAll} disabled={saving || examQuestions.length === 0} className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
            ↻ Reset
          </button>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
            + Tambah Soal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-60">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">No</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Soal</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Tipe</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Jawaban</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {examQuestions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm opacity-60 border-b border-[var(--border)]">
                    Belum ada soal. Klik "Tambah Soal" untuk menambahkan.
                  </td>
                </tr>
              ) : (
                examQuestions.map((eq, i) => (
                  <tr key={eq.id} className="hover:bg-[var(--social-bg)]">
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{i + 1}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                      <div className="line-clamp-2">{eq.question.question}</div>
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                        {getTypeLabel(eq.question.question_type)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                      <span className="text-[var(--accent)] font-medium">
                        {getAnswerDisplay(eq.question)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                      <button onClick={() => handleRemove(eq.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">Tambah Soal ke Ujian</h3>
            
            {!selectedBank ? (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Pilih Bank Soal</label>
                <div className="relative">
                  <input
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Cari bank soal..."
                  />
                  {bankResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg)] border rounded-lg max-h-48 overflow-y-auto z-10">
                      {bankResults.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-[var(--social-bg)] border-b last:border-b-0"
                          onClick={() => { setSelectedBank(bank); setBankSearch(bank.name); setBankResults([]); }}
                        >
                          <div className="font-medium">{bank.name}</div>
                          <div className="text-xs opacity-60">{bank.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">Bank: </span>
                    <span className="text-sm">{selectedBank.name}</span>
                  </div>
                  <button 
                    onClick={() => { setSelectedBank(null); setBankSearch(''); setBankQuestions([]); setSelectedQuestions([]); }}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    Ganti
                  </button>
                </div>

                {bankQuestions.length > 0 ? (
                  <>
                    <div className="mb-4 flex gap-2 items-center">
                      <select 
                        value={typeFilter} 
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="text-xs px-2 py-1 border rounded"
                      >
                        <option value="">Semua Tipe</option>
                        <option value="multiple_choice">Pilihan Ganda</option>
                        <option value="multiple_choice_multiple">PG Kompleks</option>
                        <option value="essay">Essay</option>
                        <option value="true_false">True/False</option>
                        <option value="matching">Matching</option>
                      </select>
                      <button onClick={selectAll} className="text-xs px-2 py-1 border rounded hover:bg-[var(--social-bg)]">Pilih Semua</button>
                      <button onClick={deselectAll} className="text-xs px-2 py-1 border rounded hover:bg-[var(--social-bg)]">Batal Pilih</button>
                      <span className="text-xs py-1 opacity-60">{selectedQuestions.length} dipilih</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {bankQuestions.map((q) => (
                        <label 
                          key={q.id} 
                          className={`flex items-start gap-2 p-2 border rounded cursor-pointer ${selectedQuestions.includes(q.id) ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'hover:bg-[var(--social-bg)]'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(q.id)}
                            onChange={() => toggleQuestion(q.id)}
                            className="mt-1"
                          />
                          <div className="text-sm flex-1">
                            <div className="line-clamp-2">{q.question}</div>
                            <span className="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-600">{getTypeLabel(q.question_type)}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 opacity-60">Loading soal...</div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
              <button 
                type="button" 
                onClick={handleAdd}
                disabled={saving || selectedQuestions.length === 0} 
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}