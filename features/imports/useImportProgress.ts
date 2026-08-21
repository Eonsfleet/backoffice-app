'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getDataImport,
  getDataImportRows,
  isImportFinished,
  type DataImport,
  type DataImportRow,
} from '@/features/imports/api'

const POLL_MS = 1500

/**
 * Polls a running import until it reaches a terminal state, then fetches the
 * failed rows so the operator can see exactly which lines to fix.
 *
 * Polling stops the moment the import finishes — `refetchInterval` returns false
 * rather than a number — so a completed import does not keep hitting the API.
 */
export function useImportProgress(importId: number | null) {
  const importQuery = useQuery<DataImport>({
    queryKey: ['data-import', importId],
    queryFn: () => getDataImport(importId!),
    enabled: importId != null,
    refetchInterval: (query) => (isImportFinished(query.state.data?.status) ? false : POLL_MS),
    // A just-created import is polled for freshness, so cached data is never useful here.
    staleTime: 0,
  })

  const status = importQuery.data?.status
  const finished = isImportFinished(status)
  const hasFailures = (importQuery.data?.failed_rows ?? 0) > 0

  const failedRowsQuery = useQuery<DataImportRow[]>({
    queryKey: ['data-import-rows', importId, 'invalid'],
    queryFn: () => getDataImportRows(importId!, { status: 'invalid', per_page: 100 }),
    enabled: importId != null && finished && hasFailures,
    staleTime: 60_000,
  })

  return {
    data: importQuery.data,
    failedRows: failedRowsQuery.data ?? [],
    isLoading: importQuery.isLoading,
    isError: importQuery.isError,
    finished,
    /** Nothing was written — the sheet was rejected as a whole during pre-flight. */
    rejectedWholesale: status === 'failed',
    succeeded: status === 'completed',
  }
}
