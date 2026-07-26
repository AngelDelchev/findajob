import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { ConfirmContext } from '../../confirm'
import type { ConfirmOptions } from '../../confirm'

/**
 * Promise-based replacement for `window.confirm`, so destructive actions get a
 * dialog that matches the rest of the interface and can label its own buttons.
 */
export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (result: boolean) => {
    resolver.current?.(result)
    resolver.current = null
    setOptions(null)
  }

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      <Dialog open={options !== null} onClose={() => close(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>{options?.title}</DialogTitle>

        {options?.description ? (
          <DialogContent>
            <DialogContentText>{options.description}</DialogContentText>
          </DialogContent>
        ) : null}

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => close(false)} sx={{ fontWeight: 700 }}>
            {options?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant="contained"
            color={options?.destructive ? 'error' : 'primary'}
            onClick={() => close(true)}
            sx={{ fontWeight: 800, px: 3 }}
            autoFocus
          >
            {options?.confirmLabel ?? 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
