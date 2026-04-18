import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import AttemptPage from './pages/AttemptPage'
import AttemptResultPage from './pages/AttemptResultPage'
import ExamResultsPage from './pages/ExamResultsPage'
import StartExamPage from './pages/StartExamPage'
import GradingPage from './pages/GradingPage'
import OperatorTokenPage from './pages/OperatorTokenPage'
import ReportsPage from './pages/ReportsPage'
import ReportsListPage from './pages/ReportsListPage'
import UsersPage from './pages/UsersPage'
import QuestionBanksPage from './pages/QuestionBanksPage'
import QuestionBankDetailPage from './pages/QuestionBankDetailPage'
import ExamsPage from './pages/ExamsPage'
import ExamQuestionsPage from './pages/ExamQuestionsPage'
import GroupsPage from './pages/GroupsPage'
import GroupMembersPage from './pages/GroupMembersPage'
import ExamParticipantsPage from './pages/ExamParticipantsPage'
import SettingsPage from './pages/SettingsPage'
import { getCachedUser } from './lib/auth'

function App() {
  const user = getCachedUser()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Dashboard - semua role yang login */}
      <Route
        path="/"
        element={user ? <DashboardPage /> : <Navigate to="/login" replace />}
      />
      
      {/* Admin only */}
      <Route
        path="/users"
        element={user?.roles?.includes('admin') ? <UsersPage /> : <Navigate to="/" replace />}
      />
      
      {/* Guru & Admin */}
      <Route
        path="/question-banks"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <QuestionBanksPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/question-banks/:bankId"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <QuestionBankDetailPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/exams"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <ExamsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/groups"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <GroupsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/groups/:groupId/members"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <GroupMembersPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/grading"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <GradingPage /> : <Navigate to="/" replace />}
      />
      
      {/* Operator & Admin - Token */}
      <Route
        path="/operator/exams/:examId/token"
        element={user?.roles?.includes('operator') || user?.roles?.includes('admin') ? <OperatorTokenPage /> : <Navigate to="/" replace />}
      />
      
      {/* Exam Participants */}
      <Route
        path="/exams/:examId/participants"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <ExamParticipantsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/exams/:examId/questions"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <ExamQuestionsPage /> : <Navigate to="/" replace />}
      />
      
      {/* Viewer, Guru, Admin - Reports List */}
      <Route
        path="/reports"
        element={user?.roles?.includes('viewer') || user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <ReportsListPage /> : <Navigate to="/" replace />}
      />
      
      {/* Viewer, Guru, Admin - Reports Detail */}
      <Route
        path="/reports/exams/:examId"
        element={user?.roles?.includes('viewer') || user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <ReportsPage /> : <Navigate to="/" replace />}
      />
      
      {/* Peserta - Start Exam */}
      <Route
        path="/exams/:examId/start"
        element={user ? <StartExamPage /> : <Navigate to="/login" replace />}
      />
      
      {/* Peserta - Attempt (takes exam) */}
      <Route
        path="/attempts/:attemptId"
        element={user ? <AttemptPage /> : <Navigate to="/login" replace />}
      />
      
      <Route
        path="/results/exams/:examId"
        element={user ? <AttemptResultPage /> : <Navigate to="/login" replace />}
      />
      
      {/* Exam Results - Guru/Admin only (all participant results) */}
      <Route
        path="/exams/:examId/results"
        element={user?.roles?.includes('guru') || user?.roles?.includes('admin') ? <ExamResultsPage /> : <Navigate to="/" replace />}
      />
      
      {/* Admin only - Settings */}
      <Route
        path="/settings"
        element={user?.roles?.includes('admin') ? <SettingsPage /> : <Navigate to="/" replace />}
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App