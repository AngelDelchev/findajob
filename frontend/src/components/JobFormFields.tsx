import { useMemo } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  CITIES,
  COUNTRIES,
  CURRENCIES,
  EMPLOYMENT_TYPES,
  JOB_TYPES,
  SENIORITY_LEVELS,
  WORK_MODES,
} from '../constants'
import type { JobFormState } from '../jobForm'

type Props = {
  form: JobFormState
  setForm: (value: JobFormState) => void
}

/** Splits "Sofia, Bulgaria" into its parts without keeping a second copy in state. */
function splitLocation(location: string): { city: string; country: string } {
  const parts = location.split(',').map((part) => part.trim())

  if (parts.length >= 2) {
    return { city: parts[0], country: parts.slice(1).join(', ') }
  }

  return { city: '', country: parts[0] ?? '' }
}

function joinLocation(city: string, country: string): string {
  if (city && country) return `${city}, ${country}`
  return city || country
}

export default function JobFormFields({ form, setForm }: Props) {
  /**
   * City and country are derived from `form.location` on every render rather than
   * mirrored into their own state. The previous version kept two copies in sync with
   * a pair of effects, one of which called `setForm({ ...form })` with a `form` value
   * captured from an earlier render, so editing a field and then changing the location
   * in the same tick discarded the first edit.
   */
  const { city, country } = useMemo(() => splitLocation(form.location), [form.location])

  const salary = useMemo(() => {
    const match = form.salary.match(/^([^\d\s]+)\s*(.*)$/)
    return match ? { currency: match[1], amount: match[2] } : { currency: '$', amount: form.salary }
  }, [form.salary])

  const update = <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => {
    setForm({ ...form, [key]: value })
  }

  /** The optional vocabularies all render the same way, including a "leave blank" entry. */
  const optionalSelect = (
    key: 'workMode' | 'employmentType' | 'seniorityLevel',
    label: string,
    options: readonly string[]
  ) => {
    const labelId = `${key}-label`

    return (
      <FormControl fullWidth>
        <InputLabel id={labelId}>{label}</InputLabel>
        <Select
          labelId={labelId}
          label={label}
          value={form[key]}
          onChange={(event) => update(key, event.target.value)}
        >
          <MenuItem value="">
            <em>Not specified</em>
          </MenuItem>
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  }

  const sectionHeading = (text: string) => (
    <Divider sx={{ pt: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6, letterSpacing: 1 }}>
        {text.toUpperCase()}
      </Typography>
    </Divider>
  )

  return (
    <Stack spacing={2.5} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="Job title"
          value={form.title}
          onChange={(event) => update('title', event.target.value)}
          fullWidth
          required
        />
        <TextField
          label="Company name"
          value={form.company}
          onChange={(event) => update('company', event.target.value)}
          fullWidth
          required
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Autocomplete
          fullWidth
          freeSolo
          options={COUNTRIES as readonly string[]}
          value={country}
          onInputChange={(_, value) => update('location', joinLocation(city, value))}
          renderInput={(params) => <TextField {...params} label="Country" />}
        />
        <Autocomplete
          fullWidth
          freeSolo
          options={CITIES[country] ?? []}
          value={city}
          onInputChange={(_, value) => update('location', joinLocation(value, country))}
          renderInput={(params) => <TextField {...params} label="City" />}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControl fullWidth>
          <InputLabel id="job-type-label">Job type</InputLabel>
          <Select
            labelId="job-type-label"
            label="Job type"
            value={form.jobType || 'Full-time'}
            onChange={(event) => update('jobType', event.target.value)}
          >
            {JOB_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Salary"
          type="number"
          value={salary.amount}
          onChange={(event) => update('salary', `${salary.currency} ${event.target.value}`.trim())}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Select
                    variant="standard"
                    disableUnderline
                    value={
                      (CURRENCIES as readonly string[]).includes(salary.currency)
                        ? salary.currency
                        : '$'
                    }
                    onChange={(event) => update('salary', `${event.target.value} ${salary.amount}`.trim())}
                    sx={{ mr: 1, minWidth: 40 }}
                    inputProps={{ 'aria-label': 'Currency' }}
                  >
                    {CURRENCIES.map((currency) => (
                      <MenuItem key={currency} value={currency}>
                        {currency}
                      </MenuItem>
                    ))}
                  </Select>
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {optionalSelect('workMode', 'Work mode', WORK_MODES)}
        {optionalSelect('employmentType', 'Employment type', EMPLOYMENT_TYPES)}
        {optionalSelect('seniorityLevel', 'Seniority', SENIORITY_LEVELS)}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          type="date"
          label="Application deadline"
          value={form.deadline}
          onChange={(event) => update('deadline', event.target.value)}
          helperText="Leave blank for no deadline."
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <Autocomplete<string, true, false, true>
        multiple
        freeSolo
        options={[]}
        value={form.tags}
        onChange={(_, value) => {
          // Let a pasted "React, TypeScript" become two tags rather than one.
          const expanded = value.flatMap((entry) =>
            entry
              .split(',')
              .map((part) => part.trim())
              .filter(Boolean)
          )

          update('tags', Array.from(new Set(expanded)))
        }}
        renderValue={(value, getItemProps) =>
          value.map((option, index) => {
            const { key, ...itemProps } = getItemProps({ index })
            return <Chip key={key} variant="outlined" label={option} {...itemProps} />
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Tags / skills"
            placeholder="Add a tag, separated by commas or Enter…"
          />
        )}
      />

      {sectionHeading('The role')}

      <TextField
        label="Job description"
        value={form.description}
        onChange={(event) => update('description', event.target.value)}
        multiline
        minRows={6}
        fullWidth
        required
      />

      <TextField
        label="Responsibilities"
        value={form.responsibilities}
        onChange={(event) => update('responsibilities', event.target.value)}
        multiline
        minRows={4}
        fullWidth
        helperText="One per line works well."
      />

      <TextField
        label="Requirements"
        value={form.requirements}
        onChange={(event) => update('requirements', event.target.value)}
        multiline
        minRows={4}
        fullWidth
        helperText="One per line works well."
      />

      <TextField
        label="Benefits"
        value={form.benefits}
        onChange={(event) => update('benefits', event.target.value)}
        multiline
        minRows={3}
        fullWidth
      />

      {sectionHeading('The company')}

      <TextField
        label="About the company"
        value={form.companyDescription}
        onChange={(event) => update('companyDescription', event.target.value)}
        multiline
        minRows={3}
        fullWidth
        helperText="Shown alongside the posting."
      />
    </Stack>
  )
}
