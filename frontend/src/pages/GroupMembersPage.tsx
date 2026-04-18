import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Member = {
  id: number
  name: string
  username: string
}

type User = {
  id: number
  name: string
  username: string
}

type Group = {
  id: number
  name: string
  description: string
}

export default function GroupMembersPage() {
  const user = getCachedUser()
  const canAccess = user?.roles?.includes('admin') || user?.roles?.includes('guru')
  const { groupId } = useParams()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'search' | 'import'>('search')
  
  // Search mode
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Import mode
  const [pesertaUsers, setPesertaUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!canAccess || !groupId) return
    Promise.all([
      api.get(`/groups/${groupId}`),
      api.get(`/groups/${groupId}/members`)
    ]).then(([g, m]) => {
      setGroup(g.data.data)
      setMembers(m.data.data ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [canAccess, groupId])

  useEffect(() => {
    if (!userSearch || userSearch.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      api.get(`/users/search?q=${userSearch}`).then((r) => setSearchResults(r.data.data ?? [])).catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  useEffect(() => {
    if (formMode !== 'import') return
    api.get('/users?role=peserta').then((r) => {
      // Filter out users already in group
      const memberIds = members.map(m => m.id)
      setPesertaUsers(r.data.data.filter((u: User) => !memberIds.includes(u.id)))
    }).catch(() => {})
  }, [formMode])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser || !groupId) return
    setSaving(true)
    try {
      await api.post(`/groups/${groupId}/members`, { user_id: selectedUser.id })
      setShowForm(false)
      setSelectedUser(null)
      setUserSearch('')
      setSearchResults([])
      const m = await api.get(`/groups/${groupId}/members`)
      setMembers(m.data.data ?? [])
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal menambahkan anggota')
    } finally {
      setSaving(false)
    }
  }

  async function handleImportUsers() {
    if (!groupId || selectedUsers.length === 0) return
    setSaving(true)
    try {
      await api.post(`/groups/${groupId}/members/bulk`, { user_ids: selectedUsers })
      setShowForm(false)
      setSelectedUsers([])
      const m = await api.get(`/groups/${groupId}/members`)
      setMembers(m.data.data ?? [])
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal import peserta')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(userId: number) {
    if (!confirm('Yakin hapus anggota ini?')) return
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`)
      setMembers(members.filter((m) => m.id !== userId))
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal hapus anggota')
    }
  }

  function toggleUser(id: number) {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedUsers(pesertaUsers.map(u => u.id))
  }

  function deselectAll() {
    setSelectedUsers([])
  }

  function resetForm() {
    setUserSearch('')
    setSearchResults([])
    setSelectedUser(null)
    setSelectedUsers([])
    setPesertaUsers([])
  }

  if (!canAccess) {
    return (
      <AdminLayout title="Anggota Grup">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin dan guru yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={`Anggota Grup #${groupId}`}>
      <div className="mb-4">
        <Link to="/groups" className="text-[var(--accent)] hover:underline">← Kembali ke Grup</Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold m-0">Anggota Grup</h3>
          <p className="text-sm text-[var(--text)] opacity-75">{group?.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { resetForm(); setFormMode('import'); setShowForm(true); }} className="px-4 py-2 border rounded-lg font-medium hover:bg-[var(--social-bg)]">
            + Import Peserta
          </button>
          <button onClick={() => { resetForm(); setFormMode('search'); setShowForm(true); }} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
            + Tambah Anggota
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
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">ID</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Nama</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Username</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-sm opacity-60 border-b border-[var(--border)]">
                    Belum ada anggota.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--social-bg)]">
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{m.id}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{m.name}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">@{m.username}</td>
                    <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                      <button onClick={() => handleRemove(m.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
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
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">
              {formMode === 'import' ? 'Import Peserta' : 'Tambah Anggota'}
            </h3>

            {formMode === 'import' ? (
              <div>
                <div className="mb-4 flex gap-2">
                  <button onClick={selectAll} className="text-xs px-2 py-1 border rounded hover:bg-[var(--social-bg)]">Pilih Semua</button>
                  <button onClick={deselectAll} className="text-xs px-2 py-1 border rounded hover:bg-[var(--social-bg)]">Batal Pilih</button>
                  <span className="text-xs py-1 opacity-60">{selectedUsers.length} dipilih</span>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {pesertaUsers.length === 0 ? (
                    <div className="text-center py-4 opacity-60 text-sm">Tidak ada peserta</div>
                  ) : (
                    pesertaUsers.map((u) => (
                      <label key={u.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selectedUsers.includes(u.id) ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--social-bg)]'}`}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                        />
                        <div>
                          <div className="text-sm font-medium">{u.name}</div>
                          <div className="text-xs opacity-60">@{u.username}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button 
                    onClick={handleImportUsers}
                    disabled={saving || selectedUsers.length === 0} 
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {saving ? 'Mengimport...' : 'Import'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAdd}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Cari User</label>
                  <div className="relative">
                    <input
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Ketik nama atau username..."
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg)] border rounded-lg max-h-48 overflow-y-auto z-10">
                        {searchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-[var(--social-bg)] border-b last:border-b-0"
                            onClick={() => { setSelectedUser(u); setUserSearch(u.name); setSearchResults([]); }}
                          >
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs opacity-60">@{u.username}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button type="submit" disabled={saving || !selectedUser} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50">
                    {saving ? 'Menyimpan...' : 'Tambah'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}