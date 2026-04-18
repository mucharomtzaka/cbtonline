import { useEffect, useState, useMemo } from 'react'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type UserData = {
  id: number
  name: string
  username: string
  email: string
  roles: string[]
  created_at: string
}

type SortField = 'id' | 'name' | 'username' | 'email' | 'roles' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function UsersPage() {
  const user = getCachedUser()
  const isAdmin = user?.roles?.includes('admin')

  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', roles: 'peserta' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Datatable state
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('id')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const perPage = 10

  useEffect(() => {
    if (!isAdmin) return
    api.get('/users').then((r) => setUsers(r.data.data ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [isAdmin])

  const filtered = useMemo(() => {
    let data = [...users]
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(u => 
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    }
    data.sort((a, b) => {
      let av = a[sortField]
      let bv = b[sortField]
      if (sortField === 'roles') {
        av = (av as string[]).join(',')
        bv = (bv as string[]).join(',')
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [users, search, sortField, sortDir])

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
    setForm({ name: '', username: '', email: '', password: '', roles: 'peserta' })
    setEditingUser(null)
    setShowForm(true)
  }

  function openEdit(u: UserData) {
    setForm({ name: u.name, username: u.username, email: u.email, password: '', roles: u.roles[0] || 'peserta' })
    setEditingUser(u)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      if (editingUser) {
        const payload: any = { roles: [form.roles] }
        if (form.name) payload.name = form.name
        if (form.username) payload.username = form.username
        if (form.email) payload.email = form.email
        if (form.password) payload.password = form.password
        await api.put(`/users/${editingUser.id}`, payload)
        setSuccess('User berhasil diubah')
      } else {
        await api.post('/users', form)
        setSuccess('User berhasil dibuat')
      }
      setForm({ name: '', username: '', email: '', password: '', roles: 'peserta' })
      setShowForm(false)
      setEditingUser(null)
      const r = await api.get('/users')
      setUsers(r.data.data ?? [])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan user')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Yakin hapus user ini?')) return
    try {
      await api.delete(`/users/${id}`)
      setUsers(users.filter((u) => u.id !== id))
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal hapus user')
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    guru: 'Guru',
    operator: 'Operator',
    viewer: 'Viewer',
    peserta: 'Peserta'
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="Users">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Manajemen Users">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold m-0">Daftar Users</h3>
        <button onClick={openAdd} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
          + Tambah User
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari nama, username, atau email..."
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
                  <th onClick={() => handleSort('username')} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--social-bg)]">Username {sortField === 'username' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('email')} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--social-bg)]">Email {sortField === 'email' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort('roles')} className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--social-bg)]">Roles {sortField === 'roles' && (sortDir === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-[var(--text)] opacity-70 border-b border-[var(--border)]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text)] opacity-60">Tidak ada data</td>
                  </tr>
                ) : paginated.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--social-bg)]">
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{u.id}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)] font-medium">{u.name}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">@{u.username}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{u.email}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                      {u.roles.map((r) => (
                        <span key={r} className="inline-block px-2 py-0.5 mr-1 mb-1 text-xs rounded bg-[var(--accent-bg)] text-[var(--accent)]">{roleLabels[r] || r}</span>
                      ))}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                      <button onClick={() => openEdit(u)} className="px-3 py-1 mr-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Edit</button>
                      <button onClick={() => handleDelete(u.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Hapus</button>
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
            <h3 className="text-lg font-semibold mt-0 mb-4">{editingUser ? 'Edit User' : 'Tambah User'}</h3>
            {error && <div className="mb-4 p-3 text-sm bg-red-100 text-red-700 rounded-lg">{error}</div>}
            {success && <div className="mb-4 p-3 text-sm bg-green-100 text-green-700 rounded-lg">{success}</div>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nama</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Username</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Password {editingUser && '(kosongkan jika tidak diubah)'}</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(editingUser ? {} : { required: true })} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Role</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })}>
                  <option value="peserta">Peserta</option>
                  <option value="guru">Guru</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
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