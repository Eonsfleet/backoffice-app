'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ScrollText, Search, Download, ChevronRight, Shield } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { RiskBadge } from '@/components/shared/RiskBadge'
import { JsonDiffViewer } from '@/components/shared/JsonDiffViewer'
import { SlideOver } from '@/components/shared/SlideOver'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { listAuditLogs, exportAuditLogs } from '@/features/audit-logs/api'
import type { AuditLog, RiskLevel } from '@/types/api'

const RISK_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',      label: 'All Levels' },
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const METHOD_OPTIONS = [
  { value: 'all',    label: 'All Methods' },
  { value: 'GET',    label: 'GET' },
  { value: 'POST',   label: 'POST' },
  { value: 'PUT',    label: 'PUT' },
  { value: 'PATCH',  label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

const ACTOR_OPTIONS = [
  { value: 'all',         label: 'All Actors' },
  { value: 'admin',       label: 'Admins' },
  { value: 'tenant_user', label: 'Tenant Users' },
]

const METHOD_STYLES: Record<string, string> = {
  GET:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  POST:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PUT:    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  PATCH:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function MethodBadge({ method }: { method?: string }) {
  if (!method) return null
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${METHOD_STYLES[method] ?? 'bg-muted text-muted-foreground'}`}>
      {method}
    </span>
  )
}

function LogDetailView({ log }: { log: AuditLog }) {
  const actor = log.actor ?? log.admin

  return (
    <div className="space-y-5 text-sm">
      {/* Header summary */}
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={log.method ?? log.request_method} />
        <RiskBadge level={log.risk_level} />
        {log.is_sensitive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
            <Shield className="h-3 w-3" /> Sensitive
          </span>
        )}
      </div>

      <div className="space-y-3">
        <Row label="Action"      value={log.action} />
        {log.description && <Row label="Description" value={log.description} />}
        <Row label="Path"        value={log.path ?? log.request_path ?? '—'} mono />
        <Row label="IP Address"  value={log.ip_address} mono />
        {log.user_agent && <Row label="User Agent" value={log.user_agent} />}
        {log.subject_type && <Row label="Subject" value={`${log.subject_type}${log.subject_id ? ` #${log.subject_id}` : ''}`} />}
        <Row label="Actor"       value={actor ? `${actor.name} (${actor.email})` : '—'} />
        <Row label="Actor Type"  value={actorTypeLabel(log.actor_type)} />
        {log.organization && <Row label="Organization" value={log.organization.name} />}
        <Row label="Timestamp"   value={format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')} />
      </div>

      {(log.old_values || log.new_values) && (
        <>
          <Separator />
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Changes</p>
            <JsonDiffViewer oldValues={log.old_values} newValues={log.new_values} />
          </div>
        </>
      )}
    </div>
  )
}

function actorTypeLabel(value?: string) {
  if (value === 'tenant_user') return 'Tenant User'
  if (value === 'admin') return 'Admin'
  if (value === 'system') return 'System'
  return value ?? '—'
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className={`flex-1 break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

export default function AuditLogsPage() {
  const [search, setSearch]       = useState('')
  const [riskLevel, setRiskLevel] = useState('all')
  const [method, setMethod]       = useState('all')
  const [actorType, setActorType] = useState('all')
  const [page, setPage]           = useState(1)
  const perPage                   = 20
  const [selected, setSelected]   = useState<AuditLog | null>(null)
  const [exporting, setExporting] = useState(false)

  const filters = {
    page,
    per_page: perPage,
    risk_level: riskLevel !== 'all' ? (riskLevel as RiskLevel) : undefined,
    method:     method    !== 'all' ? method                   : undefined,
    actor_type: actorType !== 'all' ? (actorType as 'admin' | 'tenant_user') : undefined,
    q:          search    || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => listAuditLogs(filters),
    staleTime: 30_000,
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAuditLogs(filters)
      toast.success('Export started')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const columns: ColumnDef<AuditLog, unknown>[] = [
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MethodBadge method={row.original.method ?? row.original.request_method} />
          <span className="text-sm font-medium">{row.original.action}</span>
        </div>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.actor?.name ?? row.original.admin?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground">{actorTypeLabel(row.original.actor_type)}</p>
        </div>
      ),
    },
    {
      id: 'organization',
      header: 'Organization',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.organization?.name ?? '—'}</span>
      ),
    },
    {
      id: 'risk_level',
      header: 'Risk',
      cell: ({ row }) => <RiskBadge level={row.original.risk_level} />,
    },
    {
      id: 'ip_address',
      header: 'IP',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.ip_address}</span>
      ),
    },
    {
      id: 'created_at',
      header: 'Timestamp',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.original.created_at), 'MMM d, yyyy HH:mm')}
        </span>
      ),
    },
    {
      id: 'view',
      header: '',
      enableHiding: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(row.original)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search actions…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8"
        />
      </div>
      <Select value={riskLevel} onValueChange={(v) => { setRiskLevel(v); setPage(1) }}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RISK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1) }}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {METHOD_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={actorType} onValueChange={(v) => { setActorType(v); setPage(1) }}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ACTOR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
        <Download className="mr-2 h-4 w-4" />{exporting ? 'Exporting…' : 'Export'}
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description={data?.meta?.total != null ? `${data.meta.total} log entries` : 'Admin and system activity trail'}
        icon={ScrollText}
      />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        toolbar={toolbar}
        pagination={{ pageIndex: page - 1, pageSize: perPage }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(s) => setPage(s.pageIndex + 1)}
      />

      <SlideOver
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title="Log Detail"
        description={selected?.action}
      >
        {selected && <LogDetailView log={selected} />}
      </SlideOver>
    </div>
  )
}
