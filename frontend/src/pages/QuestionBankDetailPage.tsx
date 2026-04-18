import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Question = {
  id: number
  question: string
  question_type: string
  media_type?: string
  media_url?: string
  media_caption?: string
  options: string[]
  correct_answer: number | string
  explanation: string
  matching_pairs?: Record<string, string>
  created_at: string
}

type QuestionBank = {
  id: number
  name: string
  description: string
}

type QuestionForm = {
  question_type: string
  question: string
  media_type: string
  media_url: string
  media_caption: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: number
  correct_multiple: number[]
  correct_true_false: string
  matching_pairs: string
  explanation: string
}

const defaultForm: QuestionForm = {
  question_type: 'multiple_choice',
  question: '',
  media_type: '',
  media_url: '',
  media_caption: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 0,
  correct_multiple: [],
  correct_true_false: 'true',
  matching_pairs: 'left1:right1\nleft2:right2',
  explanation: ''
}

export default function QuestionBankDetailPage() {
  const { bankId } = useParams()
  const user = getCachedUser()
  const canAccess = user?.roles?.includes('admin') || user?.roles?.includes('guru')

  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQ, setEditingQ] = useState<Question | null>(null)
  const [form, setForm] = useState<QuestionForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Import/Export state
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{created: number; skipped: number} | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)

  useEffect(() => {
    if (!bankId || !canAccess) return
    Promise.all([
      api.get(`/question-banks/${bankId}`),
      api.get(`/question-banks/${bankId}/questions?page=${currentPage}&per_page=${perPage}`)
    ]).then(([b, q]) => {
      setBank(b.data.data)
      setQuestions(q.data.data ?? [])
      setTotal(q.data.total ?? 0)
      setLastPage(q.data.last_page ?? 1)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [bankId, canAccess, currentPage, perPage])

  function getTypeLabel(type: string) {
    const labels: Record<string, string> = {
      multiple_choice: 'Pilihan Ganda',
      multiple_choice_multiple: 'Pilihan Ganda Kompleks',
      essay: 'Essay',
      true_false: 'True/False',
      matching: 'Matching'
    }
    return labels[type] || type
  }

  function openAdd() {
    setForm({ ...defaultForm, correct_multiple: [] })
    setEditingQ(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(q: Question) {
    const isMatching = q.question_type === 'matching'
    const correctAns = q.correct_answer
    
    setForm({
      question_type: q.question_type || 'multiple_choice',
      question: q.question || '',
      media_type: q.media_type || '',
      media_url: q.media_url || '',
      media_caption: q.media_caption || '',
      option_a: q.options?.[0] || '',
      option_b: q.options?.[1] || '',
      option_c: q.options?.[2] || '',
      option_d: q.options?.[3] || '',
      correct_answer: typeof correctAns === 'number' ? correctAns : 0,
      correct_multiple: Array.isArray(correctAns) ? correctAns : [],
      correct_true_false: String(correctAns) === 'true' ? 'true' : 'false',
      matching_pairs: isMatching && q.matching_pairs ? 
        Object.entries(q.matching_pairs).map(([k, v]) => `${k}:${v}`).join('\n') :
        'left1:right1\nleft2:right2',
      explanation: q.explanation || ''
    })
    setEditingQ(q)
    setError(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload: any = {
        question_type: form.question_type,
        question: form.question,
        media_type: form.media_type || null,
        media_url: form.media_url || null,
        media_caption: form.media_caption || null,
        explanation: form.explanation
      }

      if (form.question_type === 'multiple_choice' || form.question_type === 'multiple_choice_multiple') {
        payload.options = [form.option_a, form.option_b, form.option_c, form.option_d]
        if (form.question_type === 'multiple_choice_multiple') {
          payload.correct_answer = form.correct_multiple ?? []
        } else {
          payload.correct_answer = form.correct_answer
        }
      } else if (form.question_type === 'true_false') {
        payload.correct_answer = form.correct_true_false
      } else if (form.question_type === 'matching') {
        const pairs: Record<string, string> = {}
        form.matching_pairs.split('\n').forEach(line => {
          const [left, right] = line.split(':')
          if (left && right) pairs[left.trim()] = right.trim()
        })
        payload.matching_pairs = pairs
      }

      if (editingQ) {
        await api.put(`/question-banks/${bankId}/questions/${editingQ.id}`, payload)
      } else {
        await api.post(`/question-banks/${bankId}/questions`, payload)
      }
      setShowForm(false)
      const q = await api.get(`/question-banks/${bankId}/questions?page=${currentPage}&per_page=${perPage}`)
      setQuestions(q.data.data ?? [])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan soal')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Yakin hapus soal ini?')) return
    try {
      await api.delete(`/question-banks/${bankId}/questions/${id}`)
      setQuestions(questions.filter(q => q.id !== id))
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal hapus soal')
    }
  }

  // Export questions to Excel
  async function handleExport() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/question-banks/${bankId}/questions/export.xlsx`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `questions-bank-${bankId}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Gagal export')
    }
  }

  // Download template
  async function handleDownloadTemplate() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/question-banks/questions/template.xlsx`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'questions-template.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Gagal download template')
    }
  }

  // Handle import
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImporting(true)
    setImportResult(null)
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const r = await api.post(`/question-banks/${bankId}/questions/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImportResult({ created: r.data.created ?? 0, skipped: r.data.skipped ?? 0 })
      // Refresh questions
      const q = await api.get(`/question-banks/${bankId}/questions?page=${currentPage}&per_page=${perPage}`)
      setQuestions(q.data.data ?? [])
      setTotal(q.data.total ?? 0)
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal import')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  function renderAnswer(q: Question) {
    if (q.question_type === 'multiple_choice' || q.question_type === 'multiple_choice_multiple') {
      const correctIndices = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer as number]
      return (
        <div className="space-y-1 text-sm ml-4">
          {q.options?.map((opt, j) => (
            <div key={j} className={correctIndices.includes(j) ? 'text-green-600 font-medium' : 'text-[var(--text)] opacity-75'}>
              {String.fromCharCode(65 + j)}. {opt} {correctIndices.includes(j) && '✓'}
            </div>
          ))}
        </div>
      )
    } else if (q.question_type === 'true_false') {
      const isTrue = String(q.correct_answer) === 'true'
      return (
        <div className="text-sm ml-4">
          <span className={isTrue ? 'text-green-600 font-medium' : 'text-red-600'}>
            {isTrue ? 'True' : 'False'}
          </span>
        </div>
      )
    } else if (q.question_type === 'matching') {
      return (
        <div className="text-sm ml-4 space-y-1">
          {q.matching_pairs && Object.entries(q.matching_pairs).map(([k, v]) => (
            <div key={k}>{k} → {v}</div>
          ))}
        </div>
      )
    } else if (q.question_type === 'essay') {
      return <div className="text-sm ml-4 text-[var(--text)] opacity-75">Essay</div>
    }
    return null
  }

  if (!canAccess) {
    return (
      <AdminLayout title="Bank Soal">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin dan guru.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={bank?.name || 'Bank Soal'}>
      <div className="mb-4">
        <Link to="/question-banks" className="text-[var(--accent)] hover:underline">← Kembali ke Bank Soal</Link>
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-60">Loading...</div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">{bank?.name}</h3>
              <p className="text-sm text-[var(--text)] opacity-75">{bank?.description || 'Tidak ada deskripsi'}</p>
            </div>
            <button onClick={openAdd} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
              + Tambah Soal
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="text-sm">
              {total} soal • Halaman {currentPage} dari {lastPage}
            </div>
            <div className="flex items-center gap-2">
              <span>Tampilkan:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <div className="flex-1" />
              <button onClick={handleDownloadTemplate} className="px-3 py-1.5 text-sm border rounded hover:bg-[var(--social-bg)]">
                📥 Template
              </button>
              <label className="px-3 py-1.5 text-sm border rounded cursor-pointer hover:bg-[var(--social-bg)]">
                📤 Import
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" disabled={importing} />
              </label>
              <button onClick={handleExport} className="px-3 py-1.5 text-sm border rounded hover:bg-[var(--social-bg)]">
                📊 Export
              </button>
            </div>
          </div>

          {importResult && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
              Berhasil import! Dibuat: {importResult.created}, Dilewati: {importResult.skipped}
            </div>
          )}
          {importing && <div className="mb-4 text-sm">Mengimport...</div>}

          {questions.length === 0 ? (
            <div className="text-center py-10 opacity-60 border rounded-lg">Belum ada soal. Klik "Tambah Soal" untuk menambahkan.</div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="font-medium mb-2 flex-1">
                      {(currentPage - 1) * perPage + i + 1}. {q.question}
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{getTypeLabel(q.question_type)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(q)} className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">Edit</button>
                      <button onClick={() => handleDelete(q.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Hapus</button>
                    </div>
                  </div>
                  {/* Media Display */}
                  {q.media_url && (
                    <div className="mb-2">
                      {q.media_type === 'image' && <img src={q.media_url} alt="" className="max-h-40 rounded border" />}
                      {q.media_type === 'audio' && <audio controls src={q.media_url} className="w-full h-10" />}
                      {q.media_type === 'video' && <video controls src={q.media_url} className="max-h-40 rounded border" />}
                      {q.media_caption && <div className="text-xs text-[var(--text)] mt-1">{q.media_caption}</div>}
                    </div>
                  )}
                  {renderAnswer(q)}
                  {q.explanation && (
                    <div className="mt-2 text-sm text-[var(--text)] opacity-75 bg-[var(--social-bg)] p-2 rounded">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {lastPage > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                ← Prev
              </button>
              <span className="text-sm">
                {currentPage} / {lastPage}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(lastPage, p + 1))}
                disabled={currentPage >= lastPage}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">{editingQ ? 'Edit soal' : 'Tambah soal'}</h3>
            {error && <div className="mb-4 p-3 text-sm bg-red-100 text-red-700 rounded-lg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tipe SoaL</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={form.question_type}
                  onChange={(e) => setForm({ ...form, question_type: e.target.value })}
                  disabled={!!editingQ}
                >
                  <option value="multiple_choice">Pilihan ganda</option>
                  <option value="multiple_choice_multiple">Pilihan Ganda Kompleks</option>
                  <option value="true_false">True/False</option>
                  <option value="essay">Essay</option>
                  <option value="matching">Matching</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Pertanyaan</label>
                <textarea 
                  className="w-full px-3 py-2 border rounded-lg text-sm" 
                  rows={3} 
                  value={form.question} 
                  onChange={(e) => setForm({ ...form, question: e.target.value })} 
                  required 
                />
              </div>

              {/* Media Upload */}
              <div className="mb-4 p-3 border rounded-lg bg-[var(--social-bg)]">
                <label className="block text-sm font-medium mb-2">Media (opsional)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text)] mb-1">Tipe Media</label>
                    <select 
                      className="w-full px-2 py-1.5 border rounded text-sm"
                      value={form.media_type}
                      onChange={(e) => setForm({ ...form, media_type: e.target.value, media_url: '' })}
                    >
                      <option value="">Tidak ada</option>
                      <option value="image">Gambar (Image)</option>
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text)] mb-1">URL</label>
                    <input 
                      className="w-full px-2 py-1.5 border rounded text-sm"
                      placeholder={form.media_type === 'image' ? 'https://...' : 'URL media'}
                      value={form.media_url}
                      onChange={(e) => setForm({ ...form, media_url: e.target.value })}
                    />
                  </div>
                </div>
                {form.media_type && form.media_url && (
                  <div className="mt-2">
                    {form.media_type === 'image' && (
                      <img src={form.media_url} alt="Preview" className="max-h-32 rounded border" />
                    )}
                    {form.media_type === 'audio' && (
                      <audio controls src={form.media_url} className="w-full h-10" />
                    )}
                    {form.media_type === 'video' && (
                      <video controls src={form.media_url} className="max-h-32 rounded border" />
                    )}
                  </div>
                )}
                {form.media_type && (
                  <input 
                    className="w-full px-2 py-1.5 border rounded text-sm mt-2"
                    placeholder="Caption (opsional)"
                    value={form.media_caption}
                    onChange={(e) => setForm({ ...form, media_caption: e.target.value })}
                  />
                )}
              </div>

              {form.question_type === 'multiple_choice' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Opsi A</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.option_a} onChange={(e) => setForm({ ...form, option_a: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Opsi B</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.option_b} onChange={(e) => setForm({ ...form, option_b: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Opsi C</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.option_c} onChange={(e) => setForm({ ...form, option_c: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Opsi D</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.option_d} onChange={(e) => setForm({ ...form, option_d: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Jawaban Benar</label>
                    <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: Number(e.target.value) })}>
                      <option value={0}>A</option>
                      <option value={1}>B</option>
                      <option value={2}>C</option>
                      <option value={3}>D</option>
                    </select>
                  </div>
                </>
              )}

              {form.question_type === 'multiple_choice_multiple' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Opsi A</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.option_a} onChange={(e) => setForm({ ...form, option_a: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Opsi B</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.option_b} onChange={(e) => setForm({ ...form, option_b: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Opsi C</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.option_c} onChange={(e) => setForm({ ...form, option_c: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Opsi D</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.option_d} onChange={(e) => setForm({ ...form, option_d: e.target.value })} required />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Jawaban Benar (bisa lebih dari 1)</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['A', 'B', 'C', 'D'].map((opt, idx) => (
                        <label key={opt} className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={(form.correct_multiple ?? []).includes(idx)}
                            onChange={(e) => {
                              const current = form.correct_multiple ?? []
                              const updated = e.target.checked
                                ? [...current, idx]
                                : current.filter((i: number) => i !== idx)
                              setForm({ ...form, correct_multiple: updated })
                            }}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {form.question_type === 'true_false' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Jawaban</label>
                  <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.correct_true_false} onChange={(e) => setForm({ ...form, correct_true_false: e.target.value })}>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              )}

              {form.question_type === 'matching' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Pasangan (left:right, satu per baris)</label>
                  <textarea 
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono" 
                    rows={4}
                    value={form.matching_pairs} 
                    onChange={(e) => setForm({ ...form, matching_pairs: e.target.value })} 
                    placeholder="left1:right1&#10;left2:right2"
                  />
                </div>
              )}

              {form.question_type !== 'matching' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Penjelasan (opsional)</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}