import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Group = {
  id: number
  name: string
  description: string
  members_count: number
  created_at: string
}

export default function GroupsPage() {
  const user = getCachedUser()
  const canAccess = user?.roles?.includes('admin') || user?.roles?.includes('guru')

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!canAccess) return
    api.get('/groups').then((r) => setGroups(r.data.data ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [canAccess])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/groups', form)
      setForm({ name: '', description: '' })
      setShowForm(false)
      const r = await api.get('/groups')
      setGroups(r.data.data ?? [])
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal membuat grup')
    } finally {
      setSaving(false)
    }
  }

  if (!canAccess) {
    return (
      <AdminLayout title="Grup">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin dan guru yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Kelola Grup">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold m-0">Daftar Grup</h3>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
          + Tambah Grup
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-60">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="p-4 border rounded-lg hover:border-[var(--accent)] hover:shadow-lg transition-all">
              <div className="font-semibold text-[var(--text-h)] mb-2">{group.name}</div>
              <div className="text-sm text-[var(--text)] opacity-75 mb-3">{group.description || 'Tidak ada deskripsi'}</div>
              <div className="text-xs text-[var(--text)] opacity-60 mb-3">{group.members_count} anggota • {new Date(group.created_at).toLocaleDateString()}</div>
              <div className="flex gap-2">
                <Link to={`/groups/${group.id}/members`} className="px-3 py-1.5 text-xs border rounded hover:border-[var(--accent)]">Anggota</Link>
                <button className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Hapus</button>
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="col-span-full text-center py-10 opacity-60">Belum ada grup</div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">Tambah Grup</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nama</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
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