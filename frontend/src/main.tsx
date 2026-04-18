import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import api from './lib/api'
import './index.css'

function Root() {
  useEffect(() => {
    // Fetch settings and set document title in background
    api.get('/settings')
      .then(r => {
        const name = r.data.school_name || 'CBT Online'
        document.title = name
      })
      .catch(() => {
        document.title = 'CBT Online'
      })
  }, [])

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)