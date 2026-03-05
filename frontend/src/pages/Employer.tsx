import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Employer() {
  const [applications, setApplications] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/applications/employer')
      setApplications(response.data)
    }

    void load()
  }, [])

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto' }}>
      <h2>Employer Dashboard</h2>
      <pre>{JSON.stringify(applications, null, 2)}</pre>
    </div>
  )
}
