import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import { ListPagination, ListSearch } from '../../components/ListControls'
import { usePagedList } from '../../usePagedList'
import { formatSalary } from '../../utils'
import JobFormFields from '../../components/JobFormFields'
import { emptyJobForm, jobFormFrom, toJobRequest } from '../../jobForm'
import type { JobFormState } from '../../jobForm'
import type { AdminEmployer, AdminJob } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TextField from '@mui/material/TextField'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

type Props = {
  onChanged?: () => void | Promise<void>
}

export default function AdminJobs({ onChanged }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(0)
  const [form, setForm] = useState<JobFormState>(emptyJobForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Which employer the posting belongs to. Creating from this screen used to make the
  // administrator the owner, so the posting showed their company and never reached the
  // real employer's dashboard.
  const [employers, setEmployers] = useState<AdminEmployer[]>([])
  const [ownerId, setOwnerId] = useState('')

  const {
    items: jobs,
    page,
    setPage,
    total,
    totalPages,
    loading,
    applySearch,
    reload,
    reloadAfterRemoval,
  } = usePagedList<AdminJob>('/admin/jobs', showError)

  useEffect(() => {
    let cancelled = false

    api
      .get<AdminEmployer[]>('/admin/employers')
      .then((response) => {
        if (!cancelled) setEmployers(response.data)
      })
      .catch(() => {
        if (!cancelled) setEmployers([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const employerLabel = (employer: AdminEmployer) =>
    employer.companyName?.trim() ||
    `${employer.firstName} ${employer.lastName}`.trim() ||
    employer.email

  const create = () => {
    setError('')
    setEditingId(0)
    setForm(emptyJobForm)
    setOwnerId(employers[0]?.id ?? '')
    setOpen(true)
  }

  const edit = (job: AdminJob) => {
    setError('')
    setEditingId(job.id)
    setOwnerId(job.ownerId)
    // The list endpoint returns every writable field, tags included. It used to
    // return only a handful, and project the [NotMapped] Tags property for those,
    // so saving from this dialog wiped the tags along with the requirements,
    // responsibilities, benefits and deadline.
    setForm(jobFormFrom(job))
    setOpen(true)
  }

  const save = async () => {
    setError('')

    if (!form.title.trim() || !form.company.trim()) {
      setError('A title and company are required.')
      return
    }

    if (!ownerId) {
      setError('Choose the employer this posting belongs to.')
      return
    }

    setSaving(true)
    try {
      const body = { ...toJobRequest(form), ownerId }

      if (editingId === 0) {
        await api.post('/jobs', body)
      } else {
        await api.put(`/jobs/${editingId}`, body)
      }

      setOpen(false)
      reload()
      await onChanged?.()
      showSuccess(editingId === 0 ? 'Job created.' : 'Job updated.')
    } catch (err) {
      setError(errorMessage(err, 'Could not save this job.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = async (job: AdminJob) => {
    const archiving = !job.isDeleted

    const confirmed = await confirm({
      title: archiving ? 'Archive this job?' : 'Restore this job?',
      description: archiving
        ? 'It will stop appearing in search results. Existing applications are kept.'
        : 'It will appear in search results again.',
      confirmLabel: archiving ? 'Archive' : 'Restore',
    })

    if (!confirmed) return

    try {
      await api.put(`/admin/jobs/${job.id}/visibility`, { isDeleted: archiving })
      reload()
      await onChanged?.()
      showSuccess(archiving ? 'Job archived.' : 'Job restored.')
    } catch (err) {
      showError(errorMessage(err, 'Could not change visibility.'))
    }
  }

  const remove = async (job: AdminJob) => {
    const confirmed = await confirm({
      title: 'Delete this job permanently?',
      description: `"${job.title}" and every application submitted to it will be removed. Archiving is usually the better option.`,
      confirmLabel: 'Delete permanently',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/admin/jobs/${job.id}`)
      reloadAfterRemoval()
      await onChanged?.()
      showSuccess('Job deleted.')
    } catch (err) {
      showError(errorMessage(err, 'Could not delete this job.'))
    }
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Jobs
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ flex: 1 }}>
          <ListSearch placeholder="Search by title, company or location" onSearch={applySearch} />
          <Button
            variant="contained"
            onClick={create}
            sx={{ fontWeight: 800, flexShrink: 0 }}
            disabled={employers.length === 0}
          >
            Create job
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>ID</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Title</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Owner</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Type</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Salary</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Tags</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800, width: 260 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    Loading…
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>{job.id}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{job.title}</TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell sx={{ opacity: 0.75 }}>{job.ownerCompany || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={job.jobType}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {formatSalary(job.salary)}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {job.tags.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ height: 18, fontSize: '0.6rem' }}
                          />
                        ))}
                        {job.tags.length > 3 ? (
                          <Chip
                            label={`+${job.tags.length - 3}`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.6rem' }}
                          />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={job.isDeleted ? 'Archived' : 'Active'}
                        color={job.isDeleted ? 'warning' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => edit(job)}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color={job.isDeleted ? 'success' : 'warning'}
                          onClick={() => void toggleVisibility(job)}
                        >
                          {job.isDeleted ? 'Restore' : 'Archive'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => void remove(job)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <ListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          noun="job"
          onChange={setPage}
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {editingId === 0 ? 'Create job' : `Edit job #${editingId}`}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            fullWidth
            required
            label="Employer"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            helperText="The account this posting belongs to and appears on the dashboard of."
            sx={{ mt: 1 }}
          >
            {employers.map((employer) => (
              <MenuItem key={employer.id} value={employer.id}>
                {employerLabel(employer)}
              </MenuItem>
            ))}
          </TextField>

          <JobFormFields form={form} setForm={setForm} />
          {error ? (
            <Typography color="error" sx={{ fontWeight: 700, mt: 2 }}>
              {error}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void save()}
            sx={{ px: 4, fontWeight: 900 }}
          >
            {saving ? 'Saving…' : 'Save job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
