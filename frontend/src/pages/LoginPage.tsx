import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { login } from '../lib/auth'
import api from '../lib/api'

type Settings = {
  school_name: string
  school_level: string
  school_email: string
  school_address: string
  school_logo: string
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    api.get('/settings')
      .then(r => setSettings(r.data))
      .catch(() => {})
  }, [])

  const schoolName = settings?.school_name || 'CBT Online'
  const schoolLevel = settings?.school_level || ''
  const schoolLogo = settings?.school_logo ? `/storage/settings/${settings.school_logo}` : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ username, password, device_name: 'web' })
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (token && userData) {
        window.location.href = '/'
      } else {
        throw new Error('Data login tidak tersimpan')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Login gagal.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
      <div className="w-full max-w-sm p-8 border rounded-xl bg-[var(--bg)] shadow-lg">
        {/* Header with settings */}
        <div className="text-center mb-6">
          {schoolLogo ? (
            <img src={schoolLogo} alt="Logo" className="w-20 h-20 mx-auto mb-3 object-contain" />
          ) : (
            <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center bg-[var(--accent)] rounded-full">
              <span className="text-4xl text-white">🏫</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-[var(--accent)]">{schoolName}</h1>
          {schoolLevel && <p className="text-sm text-[var(--text)] opacity-75">{schoolLevel}</p>}
          {settings?.school_email && <p className="text-xs text-[var(--text)] opacity-60 mt-1">{settings.school_email}</p>}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-h)] mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Masukkan username"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-h)] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg bg-[var(--bg)] text-[var(--text-h)] text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="Masukkan password"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-center text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}