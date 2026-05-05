import { Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import RegisterEmployer from './pages/RegisterEmployer'
import ConfirmEmail from './pages/ConfirmEmail'
import Admin from './pages/Admin'
import Employee from './pages/Employee'
import Employer from './pages/Employer'
import Notifications from './pages/Notifications'
import Messages from './pages/Messages'
import JobDetails from './pages/JobDetails'
import Apply from './pages/Apply'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/employer" element={<RegisterEmployer />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/employee" element={<Employee />} />
        <Route path="/employer" element={<Employer />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/apply/:id" element={<Apply />} />
      </Routes>
    </AppShell>
  )
}
