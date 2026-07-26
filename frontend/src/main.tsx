import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import AuthProvider from './components/providers/AuthProvider'
import ConfirmProvider from './components/providers/ConfirmProvider'
import NotificationsProvider from './components/providers/NotificationsProvider'
import ToastProvider from './components/providers/ToastProvider'
import { theme } from './theme'
import './index.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <BrowserRouter>
          <ToastProvider>
            <ConfirmProvider>
              <AuthProvider>
                <NotificationsProvider>
                  <App />
                </NotificationsProvider>
              </AuthProvider>
            </ConfirmProvider>
          </ToastProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
)
