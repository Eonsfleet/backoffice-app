import { useUrlListState } from '@/hooks/useUrlListState'
import { useDebounce } from '@/hooks/useDebounce'
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

  const urlState = useUrlListState()
  const { search, status, page, setSearch, setStatus, setPage } = urlState
  const debouncedSearch = useDebounce(search, 300)
  const orgFilter = urlState.getFilter('organization')
  const setOrgFilter = (value: string) => urlState.setFilter('organization', value)
  const perPage = DEFAULT_PAGE_SIZE

  const [createOpen, setCreateOpenState] = useState(false)
  // Set once step 1 of "Add Vehicle" succeeds; step 2 assigns its device.
  const [createdVehicle, setCreatedVehicle] = useState<Vehicle | null>(null)
  const setCreateOpen = useCallback((open: boolean) => {
    if (!open) setCreatedVehicle(null)
    setCreateOpenState(open)
  }, [])
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportOrgId, setExportOrgId] = useState('all')
  const [exportStatus, setExportStatus] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [assignTarget, setAssignTarget] = useState<Vehicle | null>(null)
  const [unassignTarget, setUnassignTarget] = useState<Vehicle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', { search: debouncedSearch, status, orgFilter, page }],
    queryFn: () => listVehicles({
      q: debouncedSearch || undefined,
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
    onSuccess: (vehicle, payload) => {
      toast.success('Vehicle created')
      invalidateVehicles()
      // The create response may omit the organization relationship; the
      // device step needs it, so fall back to the one the admin picked.
      const picked = organizationsQuery.data?.data.find(
        (org) => String(org.identifier ?? org.id) === String(payload.organization_id),
      )
      setCreatedVehicle({
        ...vehicle,
        plate_number: vehicle.plate_number || payload.registration_number,
        organization: vehicle.organization
          ?? (picked ? { id: picked.id, name: picked.name, identifier: picked.identifier } : null),
      })
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to create vehicle')
    },
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
    const statusFilters = ['online', 'offline'].includes(exportStatus)
      ? { device_status: exportStatus }
      : { status: exportStatus !== 'all' ? exportStatus : undefined }

    setExporting(true)
    try {
      await exportVehicles({
        q: search || undefined,
        ...statusFilters,
        organization_id: exportOrgId !== 'all' ? exportOrgId : undefined,
      })
      setExportOpen(false)
      toast.success('Export started — file will download shortly')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }, [exportOrgId, exportStatus, search])

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
      createdVehicle,
      importOpen,
      setImportOpen,
      exportOpen,
      setExportOpen,
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
      exportOrgId,
      setExportOrgId,
      exportStatus,
      setExportStatus,
      handleExport,
    },
  }
}
