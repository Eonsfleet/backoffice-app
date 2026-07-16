import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createVehicle,
  deleteVehicle,
  exportVehicles,
  getVehicleMetrics,
  listVehicles,
  unassignDeviceFromVehicle,
  updateVehicle,
  type VehiclePayload,
} from '@/features/vehicles/api'
import { listOrganizations } from '@/features/organizations/api'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'
import type { Vehicle } from '@/types/api'

export function useVehiclesWorkspace() {
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = DEFAULT_PAGE_SIZE

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [assignTarget, setAssignTarget] = useState<Vehicle | null>(null)
  const [unassignTarget, setUnassignTarget] = useState<Vehicle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', { search, status, orgFilter, page }],
    queryFn: () => listVehicles({
      q: search || undefined,
      status: status !== 'all' ? status : undefined,
      organization_id: orgFilter !== 'all' ? orgFilter : undefined,
      page,
      per_page: perPage,
    }),
    staleTime: 30_000,
  })

  const metricsQuery = useQuery({
    queryKey: ['vehicle-metrics'],
    queryFn: getVehicleMetrics,
    staleTime: 60_000,
  })

  const organizationsQuery = useQuery({
    queryKey: ['orgs-dropdown'],
    queryFn: () => listOrganizations({ per_page: 100 }),
    staleTime: 120_000,
  })

  const invalidateVehicles = () => {
    qc.invalidateQueries({ queryKey: ['vehicles'] })
    qc.invalidateQueries({ queryKey: ['vehicle-metrics'] })
  }

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      toast.success('Vehicle created')
      invalidateVehicles()
      setCreateOpen(false)
    },
    onError: () => toast.error('Failed to create vehicle'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<VehiclePayload> }) =>
      updateVehicle(id, data),
    onSuccess: () => {
      toast.success('Vehicle updated')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setEditVehicle(null)
    },
    onError: () => toast.error('Failed to update vehicle'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      toast.success('Vehicle deleted')
      invalidateVehicles()
      setDeleteTarget(null)
    },
    onError: () => toast.error('Failed to delete vehicle'),
  })

  const unassignMutation = useMutation({
    mutationFn: (id: string | number) => unassignDeviceFromVehicle(id),
    onSuccess: () => {
      toast.success('Device unassigned')
      invalidateVehicles()
      setUnassignTarget(null)
    },
    onError: () => toast.error('Failed to unassign device'),
  })

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const handleOrgChange = (value: string) => {
    setOrgFilter(value)
    setPage(1)
  }

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      await exportVehicles({
        q: search || undefined,
        status: status !== 'all' ? status : undefined,
        organization_id: orgFilter !== 'all' ? orgFilter : undefined,
      })
      toast.success('Export started — file will download shortly')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }, [search, status, orgFilter])

  return {
    filters: {
      search,
      status,
      orgFilter,
      page,
      perPage,
      setPage,
      handleSearchChange,
      handleStatusChange,
      handleOrgChange,
    },
    panels: {
      createOpen,
      setCreateOpen,
      importOpen,
      setImportOpen,
      editVehicle,
      setEditVehicle,
      assignTarget,
      setAssignTarget,
      unassignTarget,
      setUnassignTarget,
      deleteTarget,
      setDeleteTarget,
    },
    queries: {
      vehicles: vehiclesQuery,
      metrics: metricsQuery,
      organizations: organizationsQuery,
    },
    mutations: {
      create: createMutation,
      update: updateMutation,
      delete: deleteMutation,
      unassign: unassignMutation,
    },
    exportState: {
      exporting,
      handleExport,
    },
  }
}
