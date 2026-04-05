import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
