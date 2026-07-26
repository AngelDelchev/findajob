import axios from 'axios'
import type { AxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

type ApiErrorBody = {
  message?: string
  title?: string
  errors?: string[] | Record<string, string[]>
}

/**
 * Turns any failure into a single sentence fit to show a user.
 *
 * Call sites previously reached into `e.response.data.message` by hand and fell
 * back to a generic string, so validation details from the server were dropped
 * and network failures surfaced as "undefined".
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const axiosError = error as AxiosError<ApiErrorBody>

  if (!axiosError?.isAxiosError) {
    return error instanceof Error ? error.message : fallback
  }

  if (!axiosError.response) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  const { status, data } = axiosError.response

  if (status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  if (status === 401) {
    return 'Your session has expired. Please log in again.'
  }

  if (status === 403) {
    return 'You do not have permission to do that.'
  }

  const details = data?.errors
  if (Array.isArray(details) && details.length > 0) {
    return details.join(' ')
  }

  // ASP.NET model-validation problems arrive as { field: [messages] }.
  if (details && typeof details === 'object') {
    const flattened = Object.values(details).flat()
    if (flattened.length > 0) {
      return flattened.join(' ')
    }
  }

  return data?.message || data?.title || fallback
}
