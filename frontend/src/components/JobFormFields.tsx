import { useState, useMemo, useEffect } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import { Select as MuiSelect } from '@mui/material'

const COUNTRIES = [
  'Bulgaria', 'United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'Japan'
]

const CITIES: Record<string, string[]> = {
  'Bulgaria': ['Sofia', 'Plovdiv', 'Varna', 'Burgas'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Glasgow'],
}

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance']
const CURRENCIES = ['$', '€', '£', 'BGN']

export type JobFormState = {
  title: string
  company: string
  location: string
  salary: string
  jobType: string
  description: string
  tags: string[]
}

export default function JobFormFields({ 
  form, 
  setForm 
}: { 
  form: JobFormState, 
  setForm: (val: JobFormState) => void 
}) {
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')

  // Sync internal city/country state with form.location when it changes from outside
  useEffect(() => {
    if (form.location && (!city || !country)) {
      const parts = form.location.split(',').map(s => s.trim())
      if (parts.length === 2) {
        setCity(parts[0])
        setCountry(parts[1])
      } else if (parts.length === 1) {
        setCountry(parts[0])
      }
    }
  }, [form.location])

  // Sync form.location with internal city/country state
  useEffect(() => {
    const loc = city ? (country ? `${city}, ${country}` : city) : country
    if (loc !== form.location) {
      setForm({ ...form, location: loc })
    }
  }, [city, country])
  
  // Extract currency and amount from salary string (e.g. "$ 5000")
  const salaryParts = useMemo(() => {
    const match = form.salary.match(/^([^0-9\s]+)\s*(.*)$/)
    if (match) {
      return { currency: match[1], amount: match[2] }
    }
    return { currency: '$', amount: form.salary }
  }, [form.salary])

  const updateSalary = (currency: string, amount: string) => {
    setForm({ ...form, salary: `${currency} ${amount}`.trim() })
  }

  const set = (key: keyof JobFormState, value: any) => {
    setForm({ ...form, [key]: value })
  }

  return (
    <Stack spacing={2.5} sx={{ mt: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField 
          label="Job Title" 
          value={form.title} 
          onChange={(e) => set('title', e.target.value)} 
          fullWidth 
          required 
        />
        <TextField 
          label="Company Name" 
          value={form.company} 
          onChange={(e) => set('company', e.target.value)} 
          fullWidth 
          required 
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Autocomplete
          fullWidth
          freeSolo
          options={COUNTRIES}
          value={country}
          onInputChange={(_, val: string) => setCountry(val)}
          renderInput={(params: any) => <TextField {...params} label="Country" />}
        />
        <Autocomplete
          fullWidth
          freeSolo
          options={CITIES[country] || []}
          value={city}
          onInputChange={(_, val: string) => setCity(val)}
          renderInput={(params: any) => <TextField {...params} label="City" />}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <FormControl fullWidth>
          <InputLabel>Job Type</InputLabel>
          <MuiSelect
            label="Job Type"
            value={form.jobType || 'Full-time'}
            onChange={(e) => set('jobType', e.target.value)}
          >
            {JOB_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </MuiSelect>
        </FormControl>

        <TextField
          fullWidth
          label="Salary"
          type="number"
          value={salaryParts.amount}
          onChange={(e) => updateSalary(salaryParts.currency, e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MuiSelect
                  variant="standard"
                  value={CURRENCIES.includes(salaryParts.currency) ? salaryParts.currency : '$'}
                  onChange={(e) => updateSalary(e.target.value as string, salaryParts.amount)}
                  sx={{ mr: 1, minWidth: 40 }}
                  disableUnderline
                >
                  {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </MuiSelect>
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Autocomplete<string, true, false, true>
        multiple
        freeSolo
        options={[]}
        value={form.tags}
        onChange={(_, newValue: string[]) => {
          // Robust tag splitting for comma-separated input
          const last = newValue[newValue.length - 1]
          if (last?.includes(',')) {
            const split = last.split(',').map((s: string) => s.trim()).filter(Boolean)
            const combined = [...newValue.slice(0, -1), ...split]
            set('tags', Array.from(new Set(combined)))
          } else {
            set('tags', newValue as string[])
          }
        }}
        renderTags={(value: string[], getTagProps: any) =>
          value.map((option: string, index: number) => {
            const { key, ...tagProps } = getTagProps({ index })
            return <Chip key={key} variant="outlined" label={option} {...tagProps} />
          })
        }
        renderInput={(params: any) => (
          <TextField {...params} label="Tags / Skills" placeholder="Add tag (separate by comma or press Enter)..." />
        )}
      />

      <TextField
        label="Job Description"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        multiline
        minRows={8}
        fullWidth
        required
      />
    </Stack>
  )
}
