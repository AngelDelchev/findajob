import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import RequireRole from './components/RequireRole'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import Employee from './pages/Employee'
import Employer from './pages/Employer'
import Notifications from './pages/Notifications'
import Messages from './pages/Messages'
import JobDetails from './pages/JobDetails'
import Apply from './pages/Apply'
import EmployerJobs from './pages/EmployerJobs'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/job/:id" element={<JobDetails />} />
        <Route
          path="/apply/:id"
          element={
            <RequireRole role="Employee">
              <Apply />
            </RequireRole>
          }
        />

        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />

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
        <Route
          path="/employer/jobs"
          element={
            <RequireRole role="Employer">
              <EmployerJobs />
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
