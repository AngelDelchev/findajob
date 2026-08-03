import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import AppShell from './components/AppShell'
import RequireRole from './components/RequireRole'
import Home from './pages/Home'
import Login from './pages/Login'
import JobDetails from './pages/JobDetails'
import NotFound from './pages/NotFound'

/*
 * The dashboards, registration flow and messaging are split into their own chunks.
 * They are only reachable once you are signed in, so loading them up front made the
 * initial bundle noticeably larger than it needed to be for a visitor who just wants
 * to search for a job.
 */
const Register = lazy(() => import('./pages/Register'))
const RegisterEmployer = lazy(() => import('./pages/RegisterEmployer'))
const ConfirmEmail = lazy(() => import('./pages/ConfirmEmail'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Admin = lazy(() => import('./pages/Admin'))
const Employee = lazy(() => import('./pages/Employee'))
const Employer = lazy(() => import('./pages/Employer'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Messages = lazy(() => import('./pages/Messages'))
const Apply = lazy(() => import('./pages/Apply'))

function RouteFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  )
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/employer" element={<RegisterEmployer />} />
          <Route path="/confirm-email" element={<ConfirmEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/jobs/:id" element={<JobDetails />} />

          {/* Any signed-in user */}
          <Route
            path="/notifications"
            element={
              <RequireRole roles={['Admin', 'Employer', 'Employee']}>
                <Notifications />
              </RequireRole>
            }
          />
          <Route
            path="/messages"
            element={
              <RequireRole roles={['Admin', 'Employer', 'Employee']}>
                <Messages />
              </RequireRole>
            }
          />

          {/* Role specific */}
          <Route
            path="/apply/:id"
            element={
              <RequireRole roles={['Employee']}>
                <Apply />
              </RequireRole>
            }
          />
          <Route
            path="/employee"
            element={
              <RequireRole roles={['Employee']}>
                <Employee />
              </RequireRole>
            }
          />
          <Route
            path="/employer"
            element={
              <RequireRole roles={['Employer']}>
                <Employer />
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole roles={['Admin']}>
                <Admin />
              </RequireRole>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}
