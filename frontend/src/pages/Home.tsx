import { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'

type JobPosting = {
  id: number
  title: string
  company: string
  description: string
  location: string
  salary: string
}

export default function Home() {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const res = await api.get('/jobs')
      setJobs(res.data)
      setLoading(false)
    }
    void run()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>findajob</h1>
      <div style={{ marginBottom: 12 }}>
        <Link to="/login">Login</Link> | <Link to="/admin">Admin</Link>
      </div>

      {loading ? <div>Loading jobs...</div> : null}

      {jobs.map(j => (
        <div key={j.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>{j.title}</div>
          <div>{j.company}</div>
          <div style={{ opacity: 0.8 }}>{j.location} • {j.salary}</div>
          <div style={{ marginTop: 8 }}>
            {j.description?.length > 120 ? j.description.slice(0, 120) + '...' : j.description}
          </div>
        </div>
      ))}
    </div>
  )
}
