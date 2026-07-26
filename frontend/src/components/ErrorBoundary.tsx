import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import Button from '@mui/material/Button'
import MessagePage from './MessagePage'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

/**
 * Catches render-time crashes.
 *
 * Without this, one bad response could throw during render and React would unmount
 * the whole tree, leaving a blank white page with the reason only visible in the
 * browser console.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ error: null })
    window.location.assign('/')
  }

  render() {
    const { error } = this.state

    if (!error) {
      return this.props.children
    }

    return (
      <MessagePage
        code="500"
        title="Something went wrong"
        description="An unexpected error stopped this page from loading. Returning to the home page usually clears it."
        details={import.meta.env.DEV ? `${error.name}: ${error.message}` : undefined}
        actions={
          <>
            <Button variant="contained" onClick={this.handleReset} sx={{ fontWeight: 800, px: 3 }}>
              Back to safety
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ fontWeight: 800 }}
            >
              Reload page
            </Button>
          </>
        }
      />
    )
  }
}
