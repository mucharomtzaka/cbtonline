import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type QuestionBank = {
  id: number
  name: string
  description: string
  questions_count: number
  created_at: string
}

type SortField = 'id' | 'name' | 'description' | 'questions_count' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function QuestionBanksPage() {
  const user = getCachedUser()
  const canAccess = user?.roles?.includes('admin') || user?.roles?.includes('guru')

  const [banks, setBanks] = useState<QuestionBank[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI Generate modal
  const [showGenModal, setShowGenModal] = useState(false)
  const [genBank, setGenBank] = useState<QuestionBank | null>(null)
  const [genForm, setGenForm] = useState({ topic: '', count: 5, type: 'multiple_choice' as 'multiple_choice' | 'true_false' | 'essay' })
  const [generating, setGenerating] = useState(false)

  // Datatable state
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const perPage = 10

  useEffect(() => {
    if (!canAccess) return
    api.get('/question-banks').then((r) => setBanks(r.data.data ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [canAccess])

  const filtered = useMemo(() => {
    let data = [...banks]
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(b => 
        b.name.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
      )
    }
    data.sort((a, b) => {
      const av = a[sortField]
      const bv = b[sortField]
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [banks, search, sortField, sortDir])

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / perPage)

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function openAdd() {
    setForm({ name: '', description: '' })
    setEditingBank(null)
    setError(null)
    setShowForm(true)
  }

  function openEdit(bank: QuestionBank) {
    setForm({ name: bank.name, description: bank.description || '' })
    setEditingBank(bank)
    setError(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (editingBank) {
        await api.put(`/question-banks/${editingBank.id}`, form)
      } else {
        await api.post('/question-banks', form)
      }
      setForm({ name: '', description: '' })
      setShowForm(false)
      setEditingBank(null)
      const r = await api.get('/question-banks')
      setBanks(r.data.data ?? [])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan bank soal')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Yakin hapus bank soal ini?')) return
    try {
      await api.delete(`/question-banks/${id}`)
      setBanks(banks.filter(b => b.id !== id))
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal hapus bank soal')
    }
  }

  function openGenerate(bank: QuestionBank) {
    setGenBank(bank)
    setGenForm({ topic: '', count: 5, type: 'multiple_choice' })
    setShowGenModal(true)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!genBank) return
    setGenerating(true)
    try {
      const res = await api.post(`/question-banks/${genBank.id}/generate`, genForm)
      alert(`Berhasil generate ${res.data.data.length} soal!`)
      setShowGenModal(false)
      // Refresh banks to get updated count
      const r = await api.get('/question-banks')
      setBanks(r.data.data ?? [])
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal generate soal')
    } finally {
      setGenerating(false)
    }
  }

  if (!canAccess) {
    return (
      <AdminLayout title="Bank Soal">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin dan guru yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Bank Soal">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold m-0">Bank Soal</h3>
        <button onClick={openAdd} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
          + Tambah Bank Soal
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari nama atau deskripsi..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full max-w-xs px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-60">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--social-bg)]">ID {sortField === 'id' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('name')} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--social-bg)]">Nama {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('description')} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--social-bg)]">Deskripsi {sortField === 'description' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('questions_count')} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--social-bg)]">Soal {sortField === 'questions_count' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('created_at')} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--social-bg)]">Dibuat {sortField === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text)] opacity-60">Tidak ada data</td>
                  </tr>
                ) : paginated.map((bank) => (
                  <tr key={bank.id} className="hover:bg-[var(--social-bg)]">
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{bank.id}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)] font-medium">{bank.name}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{bank.description || '-'}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{bank.questions_count}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{new Date(bank.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                      <Link to={`/question-banks/${bank.id}`} className="px-3 py-1 mr-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 inline-block">Lihat</Link>
                      <button onClick={() => openGenerate(bank)} className="px-3 py-1 mr-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">AI Generate</button>
                      <button onClick={() => openEdit(bank)} className="px-3 py-1 mr-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">Edit</button>
                      <button onClick={() => handleDelete(bank.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 text-sm">
              <div className="text-[var(--text)] opacity-60">
                Menampilkan {(page - 1) * perPage + 1} - {Math.min(page * perPage, filtered.length)} dari {filtered.length}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 border rounded ${page === p ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--social-bg)]'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">{editingBank ? 'Edit Bank Soal' : 'Tambah Bank Soal'}</h3>
            {error && <div className="mb-4 p-3 text-sm bg-red-100 text-red-700 rounded-lg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nama</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowGenModal(false)}>
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">Generate Soal dengan AI</h3>
            <p className="text-sm opacity-75 mb-4">Topic: <strong>{genBank?.name}</strong></p>
            <form onSubmit={handleGenerate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Topic / Materi</label>
                <textarea
                  value={genForm.topic}
                  onChange={(e) => setGenForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="Contoh: Dasar-dasar pemrograman Python, fungsi, variabel, tipe data..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Jumlah SoaL</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={genForm.count}
                    onChange={(e) => setGenForm(f => ({ ...f, count: parseInt(e.target.value) || 5 }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipe SoaL</label>
                  <select
                    value={genForm.type}
                    onChange={(e) => setGenForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="true_false">Benar/Salah</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowGenModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button type="submit" disabled={generating} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">{generating ? 'Generating...' : 'Generate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}