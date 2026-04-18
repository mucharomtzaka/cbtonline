import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { getCachedUser } from '../lib/auth'
import AdminLayout from '../lib/AdminLayout'

interface Exam {
  id: number
  title: string
  description: string | null
  duration_seconds: number | null
  status: string
}

interface PaginatedExams {
  data: Exam[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export default function ReportsListPage() {
  const user = getCachedUser()
  const navigate = useNavigate()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<number | undefined>(undefined)

  const can = user?.roles?.includes('admin') || user?.roles?.includes('guru') || user?.roles?.includes('viewer')

  const fetchExams = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      })
      if (search) {
        params.append('search', search)
      }
      const res = await api.get(`/exams?${params}`)
      const data = res.data as PaginatedExams
      setExams(data.data || [])
      setLastPage(data.last_page || 1)
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!can) return
    fetchExams()
  }, [can, page, perPage])

  useEffect(() => {
    if (!can) return
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }
    searchTimeout.current = window.setTimeout(() => {
      setPage(1)
      fetchExams()
    }, 300)
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [search])

  if (!can) {
    return (
      <AdminLayout title="Laporan Ujian">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
          <p className="text-[var(--text)] opacity-75">Hanya admin, guru, dan viewer yang dapat mengakses halaman ini.</p>
        </div>
      </AdminLayout>
    )
  }

  const goToReport = (examId: number) => {
    navigate(`/reports/exams/${examId}`)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(parseInt(e.target.value))
    setPage(1)
  }

  return (
    <AdminLayout title="Laporan Ujian">
      <div className="border rounded-lg p-4 bg-[var(--bg)]">
        {/* Search & Per Page */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Cari ujian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded-lg w-full sm:w-auto flex-1 min-w-[200px]"
          />
          <select
            value={perPage}
            onChange={handlePerPageChange}
            className="px-3 py-2 border rounded-lg"
          >
            <option value={5}>5 per halaman</option>
            <option value={10}>10 per halaman</option>
            <option value={25}>25 per halaman</option>
            <option value={50}>50 per halaman</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">No</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Judul</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Durasi</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Status</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider opacity-70 border-b">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center opacity-60">
                    Loading...
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center opacity-60">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                exams.map((exam, index) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-[var(--social-bg)] cursor-pointer"
                    onClick={() => goToReport(exam.id)}
                  >
                    <td className="px-3 py-2 border-b">{(page - 1) * perPage + index + 1}</td>
                    <td className="px-3 py-2 border-b font-medium">{exam.title}</td>
                    <td className="px-3 py-2 border-b">{exam.duration_seconds ? `${Math.round(exam.duration_seconds / 60)} menit` : '-'}</td>
                    <td className="px-3 py-2 border-b">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        exam.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : exam.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {exam.status === 'published' ? 'Published' : exam.status === 'draft' ? 'Draft' : exam.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          goToReport(exam.id)
                        }}
                        className="px-3 py-1 text-sm bg-[var(--accent)] text-white rounded hover:opacity-90"
                      >
                        Lihat Laporan
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t">
            <div className="text-sm opacity-70">
              Menampilkan {(page - 1) * perPage + 1} - {Math.min(page * perPage, total)} dari {total} data
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--social-bg)]"
              >
                ««
              </button>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--social-bg)]"
              >
                «
              </button>
              <span className="px-3 py-1 text-sm">
                Halaman {page} dari {lastPage}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === lastPage}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--social-bg)]"
              >
                »
              </button>
              <button
                onClick={() => handlePageChange(lastPage)}
                disabled={page === lastPage}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--social-bg)]"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}