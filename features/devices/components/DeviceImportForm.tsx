'use client'

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Upload, FileSpreadsheet } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { importDevices } from '@/features/devices/api'
import { listOrganizations } from '@/features/organizations/api'

const TEMPLATE_HEADERS = ['IMEI', 'Hardware Name', 'Phone Number', 'Country']
const TEMPLATE_EXAMPLE = ['358657106029759', 'Teltonika FMB140', '+2348067876208', 'NG']

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(','), TEMPLATE_EXAMPLE.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'device-import-template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function DeviceImportForm({
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

  const { data: orgsData } = useQuery({
    queryKey: ['orgs-dropdown'],
    queryFn: () => listOrganizations({ per_page: 100 }),
    staleTime: 120_000,
  })

  const orgOptions = (orgsData?.data ?? []).map((o) => ({
    value: String(o.identifier ?? o.id),
    label: o.name,
  }))

  const mutation = useMutation({
    mutationFn: () => importDevices(file!, orgId),
    onSuccess: () => {
      toast.success('Import started — devices will appear shortly')
      qc.invalidateQueries({ queryKey: ['devices'] })
      onSuccess()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Import failed')
    },
  })

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-5">
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

      <div className="rounded-lg border border-dashed p-4 bg-muted/30 space-y-2">
        <p className="text-sm font-medium">CSV Template</p>
        <p className="text-xs text-muted-foreground">
          Download the template, fill in your device data, then upload below.
          Required columns: <span className="font-mono">IMEI</span>, <span className="font-mono">Hardware Name</span>, <span className="font-mono">Phone Number</span>, <span className="font-mono">Country</span>. Use the exact hardware model name as it appears in the system.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-2 h-3.5 w-3.5" />
          Download Template
        </Button>
      </div>

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
          {mutation.isPending ? 'Uploading…' : 'Import Devices'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
