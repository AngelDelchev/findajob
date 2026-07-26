/**
 * Formats a salary for display.
 *
 * Stored values come in two shapes: a single amount entered through the job form
 * ("$ 5000") and a range from the seeded data ("$ 40000 - 120000"). The previous
 * version only matched a single number, so every range was printed raw.
 */
export function formatSalary(salary: string | null | undefined): string {
  if (!salary) return ''

  const trimmed = salary.trim()
  const match = trimmed.match(/^([^\d\s]*)\s*(.*)$/)
  if (!match) return trimmed

  const currency = match[1]
  const parts = match[2].split('-').map((part) => part.trim())
  const formatted = parts.map(formatAmount)

  // If any part was not a number the value is free text, so show it untouched.
  if (formatted.some((part) => part === null)) return trimmed

  const joined = formatted.join(' – ')
  return currency ? `${currency} ${joined}` : joined
}

function formatAmount(value: string): string | null {
  const cleaned = value.replace(/[\s,]/g, '')
  if (!cleaned) return null

  // Accepts the "150k" shorthand as well as plain digits.
  const shorthand = cleaned.match(/^(\d+(?:\.\d+)?)k$/i)
  const numeric = shorthand ? Number(shorthand[1]) * 1000 : Number(cleaned)

  if (!Number.isFinite(numeric)) return null

  return numeric.toLocaleString('en-US').replace(/,/g, ' ')
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function initials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.trim()?.[0] ?? ''
  const last = lastName?.trim()?.[0] ?? ''
  return `${first}${last}`.toUpperCase() || '?'
}

export function fullName(firstName?: string | null, lastName?: string | null): string {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim()
}
