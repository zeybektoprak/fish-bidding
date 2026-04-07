import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Setup from './pages/Setup'
import AuctionRoom from './pages/AuctionRoom'
import AdminDashboard from './pages/AdminDashboard'
import SessionManager from './pages/SessionManager'
import Payments from './pages/Payments'

function getStoredUser() {
  try {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  } catch {
    return null
  }
}

function RequireAdmin({ user, children }) {
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(getStoredUser)

  function handleLogin(u) {
    setUser(u)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages (no navbar) */}
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        <Route path="/setup" element={<Setup onLogin={handleLogin} />} />

        {/* Main app (with navbar) */}
        <Route
          path="/*"
          element={
            <>
              <Navbar user={user} onLogout={handleLogout} />
              <Routes>
                <Route path="/" element={<AuctionRoom user={user} />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin user={user}>
                      <AdminDashboard />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/sessions/:id"
                  element={
                    <RequireAdmin user={user}>
                      <SessionManager />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/sessions/:id/payments"
                  element={
                    <RequireAdmin user={user}>
                      <Payments />
                    </RequireAdmin>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
