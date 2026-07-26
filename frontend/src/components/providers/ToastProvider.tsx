import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import type { AlertColor } from '@mui/material/Alert'
import { ToastContext } from '../../toast'
import type { ToastContextValue } from '../../toast'

type Toast = {
  message: string
  severity: AlertColor
}

/**
 * Application-wide feedback.
 *
 * Success and failure were previously reported with `window.alert`, which blocks
 * the page and looks nothing like the rest of the interface.
 */
export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const [open, setOpen] = useState(false)

  const showToast = useCallback((message: string, severity: AlertColor = 'info') => {
    setToast({ message, severity })
    setOpen(true)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      showSuccess: (message: string) => showToast(message, 'success'),
      showError: (message: string) => showToast(message, 'error'),
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity ?? 'info'}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ fontWeight: 700 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}
