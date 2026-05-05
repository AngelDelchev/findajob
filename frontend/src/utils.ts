export const formatSalary = (salary: string | undefined | null) => {
  if (!salary) return ''
  
  // Matches currency symbol (non-digits at start) and the rest
  const match = salary.match(/^([^0-9\s]*)\s*(.*)$/)
  if (!match) return salary
  
  const currency = match[1]
  let amount = match[2].replace(/\s/g, '') // strip all spaces
  
  if (!amount || isNaN(Number(amount))) {
    return salary // return as is if not a number
  }

  // Format with spaces as thousand separators
  const formattedAmount = Number(amount).toLocaleString('en-US').replace(/,/g, ' ')
  
  return `${currency} ${formattedAmount}`.trim()
}
