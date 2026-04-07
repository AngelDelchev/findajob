import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00f0ff' },
    background: {
      default: '#05070a',
      paper: '#0b0f16'
    }
  },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } }
  }
})
