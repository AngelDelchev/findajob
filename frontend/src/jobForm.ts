import type { JobPosting } from './types'

/**
 * Every field the job endpoints write.
 *
 * `PUT /api/jobs/{id}` replaces the whole posting, so a form that leaves a field
 * out does not preserve it — it blanks it. This type used to cover only seven of
 * the sixteen fields, which meant saving a posting from either editor wiped its
 * requirements, responsibilities, benefits, deadline, work mode, employment type,
 * seniority level and company description.
 *
 * It lives here rather than beside the form component so that the create and edit
 * dialogs share one definition of the shape, and one way to build it.
 */
export type JobFormState = {
  title: string
  company: string
  companyDescription: string
  location: string
  salary: string
  jobType: string
  workMode: string
  employmentType: string
  seniorityLevel: string
  description: string
  requirements: string
  responsibilities: string
  benefits: string
  /** `YYYY-MM-DD`, or empty for no deadline. */
  deadline: string
  tags: string[]
}

/** A blank posting, for the create dialogs. */
export const emptyJobForm: JobFormState = {
  title: '',
  company: '',
  companyDescription: '',
  location: '',
  salary: '$ 0',
  jobType: 'Full-time',
  workMode: '',
  employmentType: '',
  seniorityLevel: '',
  description: '',
  requirements: '',
  responsibilities: '',
  benefits: '',
  deadline: '',
  tags: [],
}

/** `2026-08-15T00:00:00Z` -> `2026-08-15`, which is what `<input type="date">` wants. */
const toDateInput = (value: string | null | undefined): string => (value ? value.slice(0, 10) : '')

/**
 * Builds form state from a posting the API returned. The edit dialogs used to copy
 * fields across by hand and each missed a different set.
 */
export function jobFormFrom(job: Partial<JobPosting>): JobFormState {
  return {
    title: job.title ?? '',
    company: job.company ?? '',
    companyDescription: job.companyDescription ?? '',
    location: job.location ?? '',
    salary: job.salary || '$ 0',
    jobType: job.jobType || 'Full-time',
    workMode: job.workMode ?? '',
    employmentType: job.employmentType ?? '',
    seniorityLevel: job.seniorityLevel ?? '',
    description: job.description ?? '',
    requirements: job.requirements ?? '',
    responsibilities: job.responsibilities ?? '',
    benefits: job.benefits ?? '',
    deadline: toDateInput(job.deadline),
    tags: job.tags ?? [],
  }
}

/**
 * The request body.
 *
 * Only the deadline needs translating: empty becomes a real null, and a date is
 * sent as the end of that day. Sending the bare date would land on midnight, which
 * would mean a posting whose deadline is today counts as expired the moment anyone
 * saves it — "apply before the 9th" should include the 9th.
 */
export const toJobRequest = (form: JobFormState) => ({
  ...form,
  deadline: form.deadline ? `${form.deadline}T23:59:59` : null,
})
