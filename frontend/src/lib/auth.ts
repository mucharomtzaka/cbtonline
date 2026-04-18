import api from './api'

export type User = {
  id: number
  name: string
  username: string
  email: string
  roles: string[]
}

export async function login(params: {
  username: string
  password: string
  device_name?: string
}): Promise<{ token: string; user: User }> {
  const res = await api.post('/auth/login', params)
  const token = res.data.token
  const user = res.data.user
  if (!token || !user) {
    throw new Error('Invalid response')
  }
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  return { token, user }
}

export async function me() {
  const res = await api.get('/auth/me')
  const user = res.data.user as User
  localStorage.setItem('user', JSON.stringify(user))
  return user
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

export function getCachedUser(): User | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function getCachedToken(): string | null {
  return localStorage.getItem('token')
}

