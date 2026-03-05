import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Admin() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/admin/stats')
      setStats(response.data)
    }

    void load()
  }, [])

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto' }}>
      <h2>Admin Dashboard</h2>
      <pre>{stats ? JSON.stringify(stats, null, 2) : 'Loading...'}</pre>
    </div>
  )
}
