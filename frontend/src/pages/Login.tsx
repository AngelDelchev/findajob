import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const success = await login(loginName, password)
    if (!success) {
      setError('Invalid credentials.')
      return
    }

    if (!user) {
      navigate('/')
      return
    }

    if (user.roles.includes('Admin')) {
      navigate('/admin')
    } else if (user.roles.includes('Employer')) {
      navigate('/employer')
    } else {
      navigate('/employee')
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto' }}>
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Email or username"
          />
        </div>

        <div style={{ marginTop: '10px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
        </div>

        <button type="submit" style={{ marginTop: '12px' }}>
          Login
        </button>
      </form>

      {error ? <p>{error}</p> : null}
    </div>
  )
}
