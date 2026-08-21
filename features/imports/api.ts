import { api } from '@/lib/api/client'

/**
 * Status vocabulary shared by every admin import (vehicles, devices, users).
 *
 * `validating` is the pre-flight pass: the whole sheet is checked before a single
 * record is written, so `failed` at that stage means nothing was imported at all.
 */
export type ImportStatus =
  | 'pending'
  | 'validating'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'

export const IMPORT_FINISHED: ImportStatus[] = ['completed', 'completed_with_errors', 'failed']

export function isImportFinished(status: ImportStatus | undefined): boolean {
  return !!status && IMPORT_FINISHED.includes(status)
}

export interface DataImport {
  id: number
  module: string
  import_type: string
  status: ImportStatus
  progress_percent: number
  total_rows: number
  successful_rows: number
  failed_rows: number
  skipped_rows: number
  duplicate_rows: number
  created_count: number
  updated_count: number
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
}

export interface DataImportRow {
  id: number
  row_number: number
  status: string
  raw_data: Record<string, unknown> | null
  target_type: string | null
  target_id: number | null
  error_message: string | null
  warnings: string[] | null
}

export const getDataImport = async (id: number | string): Promise<DataImport> => {
  const { data } = await api.get(`/admin/data-imports/${id}`)
  return data.data as DataImport
}

export const getDataImportRows = async (
  id: number | string,
  params?: { status?: string; per_page?: number },
): Promise<DataImportRow[]> => {
  const { data } = await api.get(`/admin/data-imports/${id}/rows`, { params })
  return (data.data?.rows ?? []) as DataImportRow[]
}

/**
 * What POST /admin/file/import answers with. The id is a data_imports row, not a
 * Bus batch: progress and per-row reasons are read from /admin/data-imports/{id}.
 */
export interface ImportStartedResponse {
  data_import_id: number
  status: ImportStatus
}
