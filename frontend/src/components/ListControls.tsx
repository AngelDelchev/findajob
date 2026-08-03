import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'

type ListSearchProps = {
  placeholder: string
  onSearch: (term: string) => void
}

/**
 * Search box for the administration lists. Submitting runs the search on the server,
 * so the whole table no longer has to be in the browser to filter it.
 */
export function ListSearch({ placeholder, onSearch }: ListSearchProps) {
  const [term, setTerm] = useState('')

  const clear = () => {
    setTerm('')
    onSearch('')
  }

  return (
    <Stack
      component="form"
      direction="row"
      spacing={1}
      onSubmit={(event) => {
        event.preventDefault()
        onSearch(term.trim())
      }}
      sx={{ flex: 1, maxWidth: 480 }}
    >
      <TextField
        size="small"
        fullWidth
        value={term}
        placeholder={placeholder}
        onChange={(event) => setTerm(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ opacity: 0.5 }} fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: term ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clear} aria-label="Clear search">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
          htmlInput: { 'aria-label': placeholder },
        }}
      />
      <Button type="submit" variant="outlined" sx={{ fontWeight: 800, flexShrink: 0 }}>
        Search
      </Button>
    </Stack>
  )
}

type ListPaginationProps = {
  page: number
  totalPages: number
  total: number
  noun: string
  onChange: (page: number) => void
}

/** Page picker plus a count, shown under each administration table. */
export function ListPagination({
  page,
  totalPages,
  total,
  noun,
  onChange,
}: ListPaginationProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems="center"
      spacing={1}
      sx={{ p: 2 }}
    >
      <Typography variant="body2" sx={{ opacity: 0.6, fontWeight: 600 }}>
        {total} {noun}
        {total === 1 ? '' : 's'}
      </Typography>

      {totalPages > 1 ? (
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => onChange(value)}
          color="primary"
          shape="rounded"
          size="small"
        />
      ) : (
        <Box />
      )}
    </Stack>
  )
}
