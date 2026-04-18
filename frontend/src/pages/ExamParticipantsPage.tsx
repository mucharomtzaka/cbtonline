import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Participant = {
  id: number
  user: { id: number; name: string; username: string }
  status: string
  created_at: string
}

type Group = {
  id: number
  name: string
}

export default function ExamParticipantsPage() {
  const user = getCachedUser()
  const canAccess = user?.roles?.includes('admin') || user?.roles?.includes('guru')
  const { examId } = useParams()

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'search' | 'group'>('search')
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!canAccess || !examId) return
    api.get(`/exams/${examId}/participants`).then((r) => setParticipants(r.data.data ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [canAccess, examId])

  useEffect(() => {
    api.get('/groups').then((r) => setGroups(r.data.data ?? [])).catch(() => {})
  }, [])

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
    if (!selectedGroup) {
      setGroupMembers([])
      return
    }
    api.get(`/groups/${selectedGroup.id}/members`).then((r) => setGroupMembers(r.data.data ?? [])).catch(() => {})
  }, [selectedGroup])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser || !examId) return
    setSaving(true)
    try {
      await api.post(`/exams/${examId}/participants/register`, { user_id: selectedUser.id })
      setShowForm(false)
      setSelectedUser(null)
      setUserSearch('')
      setSearchResults([])
      const r = await api.get(`/exams/${examId}/participants`)
      setParticipants(r.data.data ?? [])
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal menambahkan peserta')
    } finally {
      setSaving(false)
    }
  }

  async function handleImportFromGroup() {
    if (!selectedGroup || !examId) return
    setSaving(true)
    try {
      await api.post(`/exams/${examId}/participants/import-group`, { group_id: selectedGroup.id })
      setShowForm(false)
      setSelectedGroup(null)
      const r = await api.get(`/exams/${examId}/participants`)
      setParticipants(r.data.data ?? [])
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal import peserta')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: number) {
    if (!confirm('Yakin hapus peserta ini?')) return
    try {
      await api.delete(`/exams/${examId}/participants/${id}`)
      setParticipants(participants.filter((p) => p.id !== id))
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Gagal hapus peserta')
    }
  }

  function resetForm() {
    setUserSearch('')
    setSearchResults([])
    setSelectedUser(null)
    setSelectedGroup(null)
    setGroupMembers([])
    setFormMode('search')
  }

  if (!canAccess) {
    return (
      <AdminLayout title="Peserta Ujian">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin dan guru yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={`Peserta Ujian #${examId}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold m-0">Peserta Ujian</h3>
        <div className="flex gap-2">
          <button onClick={() => { resetForm(); setFormMode('group'); setShowForm(true); }} className="px-4 py-2 border rounded-lg font-medium hover:bg-[var(--social-bg)]">
            + Import Kelompok
          </button>
          <button onClick={() => { resetForm(); setFormMode('search'); setShowForm(true); }} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90">
            + Tambah Peserta
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
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Peserta</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Status</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Terdaftar</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b border-[var(--border)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--social-bg)]">
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{p.id}</td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                    <div className="font-medium">{p.user.name}</div>
                    <div className="text-xs opacity-60">@{p.user.username}</div>
                  </td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                      p.status === 'registered' ? 'bg-green-100 text-green-700' :
                      p.status === 'started' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                  <td className="px-3 py-3 text-sm border-b border-[var(--border)]">
                    <button onClick={() => handleRemove(p.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg)] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mt-0 mb-4">
              {formMode === 'group' ? 'Import dari Kelompok' : 'Tambah Peserta'}
            </h3>

            {formMode === 'group' ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Pilih Kelompok</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={selectedGroup?.id || ''}
                    onChange={(e) => {
                      const g = groups.find(g => g.id === Number(e.target.value))
                      setSelectedGroup(g || null)
                    }}
                  >
                    <option value="">-- pilih kelompok --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                {groupMembers.length > 0 && (
                  <div className="mb-4 p-3 bg-[var(--social-bg)] rounded-lg">
                    <div className="text-sm font-medium mb-2">Anggota ({groupMembers.length})</div>
                    <div className="text-xs opacity-60">{groupMembers.map(m => m.name).join(', ')}</div>
                  </div>
                )}
                <div className="flex gap-3 justify-end mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button 
                    type="button" 
                    onClick={handleImportFromGroup}
                    disabled={saving || !selectedGroup || groupMembers.length === 0} 
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