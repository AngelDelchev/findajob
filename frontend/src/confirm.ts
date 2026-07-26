import { createContext, useContext } from 'react'

export type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
