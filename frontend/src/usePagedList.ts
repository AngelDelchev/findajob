import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from './api'
import type { Paged } from './types'

/**
 * Drives a server-paged, server-searched list.
 *
 * The administration screens used to fetch whole tables — every user, every posting,
 * every application — and render them as one enormous unsearchable table. All three
 * needed the same paging, searching and reloading, so it lives here once.
 */
export function usePagedList<T>(
  path: string,
  onError: (message: string) => void,
  pageSize = 25
) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  // Bumped to re-run the effect after a change that the list should reflect.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    api
      .get<Paged<T>>(path, {
        params: { search: search || undefined, page, pageSize },
      })
      .then((response) => {
        if (cancelled) return
        setItems(response.data.items)
        setTotal(response.data.total)
        setTotalPages(response.data.totalPages)
      })
      .catch((error) => {
        if (!cancelled) onError(errorMessage(error, 'Could not load this list.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, page, search, pageSize, reloadKey, onError])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  /** A new search always starts from the first page. */
  const applySearch = useCallback((term: string) => {
    setSearch(term)
    setPage(1)
  }, [])

  /**
   * Removing the last row on a page would otherwise leave the view stranded on an
   * empty page, so step back one when that happens.
   */
  const reloadAfterRemoval = useCallback(() => {
    if (items.length === 1 && page > 1) {
      setPage((current) => current - 1)
      return
    }

    setReloadKey((key) => key + 1)
  }, [items.length, page])

  return {
    items,
    page,
    setPage,
    total,
    totalPages,
    loading,
    search,
    applySearch,
    reload,
    reloadAfterRemoval,
  }
}
