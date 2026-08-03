/**
 * Shared option lists. These were duplicated across Register, RegisterEmployer,
 * JobFormFields and ProfileHeader, so adding a country meant editing four files.
 */

export const COUNTRIES = [
  'Bulgaria',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Canada',
  'Australia',
  'Japan',
] as const

export const CITIES: Record<string, string[]> = {
  Bulgaria: ['Sofia', 'Plovdiv', 'Varna', 'Burgas'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Glasgow'],
  Germany: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
  France: ['Paris', 'Lyon', 'Marseille', 'Toulouse'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama'],
}

export const citiesFor = (country: string): string[] => CITIES[country] ?? []

export const JOB_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
] as const

export const WORK_MODES = ['Remote', 'On-site', 'Hybrid'] as const

export const EMPLOYMENT_TYPES = ['Permanent', 'Temporary'] as const

export const SENIORITY_LEVELS = ['Junior', 'Mid', 'Senior', 'Lead'] as const

export const CURRENCIES = ['$', '€', '£', 'BGN'] as const

export const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees',
] as const

/** Rules mirrored from the server's Identity password policy. */
export const passwordChecks = (password: string, confirmPassword: string) => [
  { label: 'At least 8 characters', ok: password.length >= 8 },
  { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
  { label: 'One lowercase letter', ok: /[a-z]/.test(password) },
  { label: 'One number', ok: /\d/.test(password) },
  { label: 'One special character', ok: /[^A-Za-z0-9]/.test(password) },
  {
    label: 'Passwords match',
    ok: password.length > 0 && password === confirmPassword,
  },
]

export const isPasswordValid = (password: string, confirmPassword: string) =>
  passwordChecks(password, confirmPassword).every((check) => check.ok)
