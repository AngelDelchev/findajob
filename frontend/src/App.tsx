import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'
import Home from './pages/Home'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Employee from './pages/Employee'
import Employer from './pages/Employer'

function RequireRole({
  role,
  children
}: {
  role: string
  children: JSX.Element
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.roles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireRole role="Admin">
            <Admin />
          </RequireRole>
        }
      />
      <Route
        path="/employee"
        element={
          <RequireRole role="Employee">
            <Employee />
          </RequireRole>
        }
      />
      <Route
        path="/employer"
        element={
          <RequireRole role="Employer">
            <Employer />
          </RequireRole>
        }
      />
    </Routes>
  )
}
