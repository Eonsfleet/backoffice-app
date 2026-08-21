'use client'

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { importVehicles, downloadVehicleImportTemplate } from '@/features/vehicles/api'
import { listOrganizations } from '@/features/organizations/api'
import { ImportProgress } from '@/features/imports/components/ImportProgress'
import { ImportInstructions } from '@/features/imports/components/ImportInstructions'

export function VehicleImportForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [orgId, setOrgId]         = useState('')
  const [file, setFile]           = useState<File | null>(null)
  const [orgError, setOrgError]   = useState('')
  const [fileError, setFileError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [importId, setImportId]   = useState<number | null>(null)

  const { data: orgsData } = useQuery({
    queryKey: ['orgs-dropdown'],
    queryFn: () => listOrganizations({ per_page: 100 }),
    staleTime: 120_000,
  })

  const orgOptions = (orgsData?.data ?? []).map((o) => ({
    value: String(o.identifier ?? o.id),
    label: o.name,
  }))

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      await downloadVehicleImportTemplate()
    } catch {
      toast.error('Failed to download template')
    } finally {
      setDownloading(false)
    }
  }

  const mutation = useMutation({
    mutationFn: () => importVehicles(file!, orgId),
    // The form switches to the progress view rather than closing: the sheet is
    // validated in full before anything is written, so the outcome — and any
    // per-row reasons — is what the operator needs to see, not a fire-and-forget toast.
    onSuccess: (result) => setImportId(result.data_import_id),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Import failed')
    },
  })

  const handleFinished = () => {
    qc.invalidateQueries({ queryKey: ['vehicles'] })
    qc.invalidateQueries({ queryKey: ['vehicle-metrics'] })
    onSuccess()
  }

  const handleReset = () => {
    setImportId(null)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setFileError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let valid = true
    if (!orgId) { setOrgError('Organization is required'); valid = false }
    if (!file)  { setFileError('Please select a CSV or Excel file'); valid = false }
    if (!valid) return
    mutation.mutate()
  }

  if (importId !== null) {
    return (
      <div className="px-5 pb-1">
        <ImportProgress
          importId={importId}
          module="vehicle"
          onDone={handleFinished}
          onReset={handleReset}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-5">
      {/* Organization */}
      <div className="space-y-1.5">
        <Label>Organization *</Label>
        <SearchableSelect
          options={orgOptions}
          value={orgId}
          onValueChange={(v) => { setOrgId(v); setOrgError('') }}
          placeholder="Select organization"
          searchPlaceholder="Search organizations…"
        />
        {orgError && <p className="text-xs text-destructive">{orgError}</p>}
      </div>

      <ImportInstructions
        module="vehicle"
        onDownloadTemplate={handleDownloadTemplate}
        downloading={downloading}
      />

      {/* File upload */}
      <div className="space-y-1.5">
        <Label>Upload File *</Label>
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center hover:bg-muted/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          ) : (
            <>
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to select CSV or Excel file</p>
              <p className="text-xs text-muted-foreground mt-0.5">.csv, .xlsx, .xls accepted</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
        {fileError && <p className="text-xs text-destructive">{fileError}</p>}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={mutation.isPending} className="flex-1">
          {mutation.isPending ? 'Uploading…' : 'Import Vehicles'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
