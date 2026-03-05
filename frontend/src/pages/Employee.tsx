import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Employee() {
  const [applications, setApplications] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const response = await api.get('/applications/mine')
      setApplications(response.data)
    }

    void load()
  }, [])

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto' }}>
      <h2>Employee Dashboard</h2>
      <pre>{JSON.stringify(applications, null, 2)}</pre>
    </div>
  )
}
