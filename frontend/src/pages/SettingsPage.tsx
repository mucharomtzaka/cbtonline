import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

type Settings = {
  school_name: string
  school_level: string
  school_email: string
  school_address: string
  school_logo: string
  ai_provider: string
  gemini_api_key: string
  gemini_model: string
  openai_api_key: string
  openai_model: string
  anthropic_api_key: string
  anthropic_model: string
}

export default function SettingsPage() {
  const user = getCachedUser()
  const canAccess = user?.roles?.includes('admin')
  const [settings, setSettings] = useState<Settings>({
    school_name: '',
    school_level: '',
    school_email: '',
    school_address: '',
    school_logo: '',
    ai_provider: 'gemini',
    gemini_api_key: '',
    gemini_model: 'gemini-2.0-flash',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    anthropic_api_key: '',
    anthropic_model: 'claude-3-haiku-20240307',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!canAccess) return
    api.get('/settings')
      .then(r => {
        setSettings(r.data)
        if (r.data.school_logo) {
          setLogoPreview(`/storage/settings/${r.data.school_logo}`)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [canAccess])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await api.put('/settings', settings)
      setMessage('Pengaturan berhasil disimpan!')
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    setSaving(true)
    try {
      const r = await api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSettings(s => ({ ...s, school_logo: r.data.filename }))
      setLogoPreview(`/storage/settings/${r.data.filename}`)
      setMessage('Logo berhasil diupload!')
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Gagal upload logo')
    } finally {
      setSaving(false)
    }
  }

  if (!canAccess) {
    return (
      <AdminLayout title="Pengaturan">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Pengaturan">
      <div className="mb-6">
        <Link to="/" className="text-[var(--accent)] hover:underline">← Kembali ke Dashboard</Link>
      </div>

      {loading ? (
        <div className="text-center py-10 opacity-60">Loading...</div>
      ) : (
        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Section */}
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Logo Sekolah</h3>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-4xl opacity-30">🏫</span>
                  )}
                </div>
                <div>
                  <label className="block">
                    <span className="sr-only">Pilih Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      disabled={saving}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-[var(--accent)] file:text-white
                        hover:file:opacity-90
                        disabled:opacity-50
                      "
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Format: JPEG, PNG, GIF, SVG. Max 2MB</p>
                </div>
              </div>
            </div>

            {/* Basic Info Section */}
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Informasi Sekolah</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nama Sekolah</label>
                  <input
                    type="text"
                    value={settings.school_name}
                    onChange={e => setSettings(s => ({ ...s, school_name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="SMK Negeri 1 Jakarta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jenjang</label>
                  <select
                    value={settings.school_level}
                    onChange={e => setSettings(s => ({ ...s, school_level: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Pilih Jenjang</option>
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                    <option value="Universitas">Universitas</option>
                    <option value="Institut">Institut</option>
                    <option value="Sekolah Tinggi">Sekolah Tinggi</option>
                    <option value="Akademi">Akademi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={settings.school_email}
                    onChange={e => setSettings(s => ({ ...s, school_email: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="info@sekolah.sch.id"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Alamat</label>
                  <textarea
                    value={settings.school_address}
                    onChange={e => setSettings(s => ({ ...s, school_address: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Jl. Merdeka No. 1, Jakarta Pusat"
                  />
                </div>
              </div>
            </div>

            {/* AI Settings */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-3">Pengaturan AI</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Provider</label>
                <select
                  value={settings.ai_provider}
                  onChange={e => setSettings(s => ({ ...s, ai_provider: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>

              {settings.ai_provider === 'gemini' && (
                <div className="grid gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.gemini_api_key}
                      onChange={e => setSettings(s => ({ ...s, gemini_api_key: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="AIza..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Model</label>
                    <select
                      value={settings.gemini_model}
                      onChange={e => setSettings(s => ({ ...s, gemini_model: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </select>
                  </div>
                </div>
              )}

              {settings.ai_provider === 'openai' && (
                <div className="grid gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.openai_api_key}
                      onChange={e => setSettings(s => ({ ...s, openai_api_key: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Model</label>
                    <select
                      value={settings.openai_model}
                      onChange={e => setSettings(s => ({ ...s, openai_model: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>
                </div>
              )}

              {settings.ai_provider === 'anthropic' && (
                <div className="grid gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.anthropic_api_key}
                      onChange={e => setSettings(s => ({ ...s, anthropic_api_key: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="sk-ant-..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Model</label>
                    <select
                      value={settings.anthropic_model}
                      onChange={e => setSettings(s => ({ ...s, anthropic_model: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {message && (
              <div className={`p-3 rounded-lg ${message.includes('berhasil') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </form>
        </div>
      )}
    </AdminLayout>
  )
}