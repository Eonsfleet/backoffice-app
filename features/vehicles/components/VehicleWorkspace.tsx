'use client'

import { useMemo } from 'react'
import { Download, Plus, Truck, Upload } from 'lucide-react'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { SlideOver } from '@/components/shared/SlideOver'
import { Button } from '@/components/ui/button'
import { AssignDeviceForm } from '@/features/vehicles/components/AssignDeviceForm'
import { VehicleFormFields } from '@/features/vehicles/components/VehicleFormFields'
import { VehicleImportForm } from '@/features/vehicles/components/VehicleImportForm'
import { VehicleMetrics } from '@/features/vehicles/components/VehicleMetrics'
import { VehicleToolbar } from '@/features/vehicles/components/VehicleToolbar'
import { useVehiclesWorkspace } from '@/features/vehicles/hooks/useVehiclesWorkspace'
import { createVehicleColumns } from '@/features/vehicles/utils/vehicle-columns'

export function VehicleWorkspace() {
  const {
    filters,
    panels,
    queries,
    mutations,
    exportState,
  } = useVehiclesWorkspace()

  const data = queries.vehicles.data
  const columns = useMemo(() => createVehicleColumns({
    onEdit: panels.setEditVehicle,
    onAssignDevice: panels.setAssignTarget,
    onUnassignDevice: panels.setUnassignTarget,
    onDelete: panels.setDeleteTarget,
  }), [panels.setAssignTarget, panels.setDeleteTarget, panels.setEditVehicle, panels.setUnassignTarget])

  const toolbar = (
    <VehicleToolbar
      search={filters.search}
      status={filters.status}
      orgFilter={filters.orgFilter}
      organizations={queries.organizations.data?.data}
      onSearchChange={filters.handleSearchChange}
      onStatusChange={filters.handleStatusChange}
      onOrgChange={filters.handleOrgChange}
    />
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description={data?.meta?.total != null ? `${data.meta.total} vehicles across all organizations` : 'Platform-wide vehicle fleet'}
        icon={Truck}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportState.handleExport} disabled={exportState.exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exportState.exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button variant="outline" onClick={() => panels.setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button onClick={() => panels.setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Vehicle
            </Button>
          </div>
        }
      />

      <VehicleMetrics metrics={queries.metrics.data} isLoading={queries.metrics.isLoading} />

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={queries.vehicles.isLoading}
        toolbar={toolbar}
        pagination={{ pageIndex: filters.page - 1, pageSize: filters.perPage }}
        pageCount={data?.meta?.last_page ?? 1}
        onPaginationChange={(state) => filters.setPage(state.pageIndex + 1)}
      />

      <SlideOver
        open={panels.createOpen}
        onOpenChange={panels.setCreateOpen}
        title="Add Vehicle"
        description="Register a new vehicle to an organization."
      >
        <VehicleFormFields
          onSubmit={(vehicle) => mutations.create.mutate({ ...vehicle, organization_id: vehicle.organization_id })}
          isPending={mutations.create.isPending}
          onCancel={() => panels.setCreateOpen(false)}
        />
      </SlideOver>

      <SlideOver
        open={panels.importOpen}
        onOpenChange={panels.setImportOpen}
        title="Import Vehicles"
        description="Upload a CSV or Excel file to bulk-add vehicles. Select the organization first, then upload."
      >
        <VehicleImportForm onSuccess={() => panels.setImportOpen(false)} onCancel={() => panels.setImportOpen(false)} />
      </SlideOver>

      <SlideOver
        open={!!panels.editVehicle}
        onOpenChange={(open) => !open && panels.setEditVehicle(null)}
        title="Edit Vehicle"
        description={panels.editVehicle?.plate_number}
      >
        {panels.editVehicle && (
          <VehicleFormFields
            vehicle={panels.editVehicle}
            onSubmit={(vehicle) => mutations.update.mutate({ id: panels.editVehicle!.id, data: vehicle })}
            isPending={mutations.update.isPending}
            onCancel={() => panels.setEditVehicle(null)}
          />
        )}
      </SlideOver>

      <SlideOver
        open={!!panels.assignTarget}
        onOpenChange={(open) => !open && panels.setAssignTarget(null)}
        title="Assign Device"
        description={`Assign a tracker to ${panels.assignTarget?.plate_number}`}
      >
        {panels.assignTarget && (
          <AssignDeviceForm
            vehicle={panels.assignTarget}
            onSuccess={() => panels.setAssignTarget(null)}
            onCancel={() => panels.setAssignTarget(null)}
          />
        )}
      </SlideOver>

      {panels.unassignTarget && (
        <ConfirmDialog
          open={!!panels.unassignTarget}
          onOpenChange={(open) => !open && panels.setUnassignTarget(null)}
          title="Unassign Device"
          description={`Remove device ${panels.unassignTarget.device_id} from ${panels.unassignTarget.plate_number}? The device will become unassigned.`}
          confirmLabel="Unassign"
          variant="destructive"
          onConfirm={() => mutations.unassign.mutateAsync(panels.unassignTarget!.id)}
        />
      )}

      {panels.deleteTarget && (
        <ConfirmDialog
          open={!!panels.deleteTarget}
          onOpenChange={(open) => !open && panels.setDeleteTarget(null)}
          title="Delete Vehicle"
          description={`Permanently delete vehicle "${panels.deleteTarget.plate_number}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => mutations.delete.mutateAsync(panels.deleteTarget!.id)}
        />
      )}
    </div>
  )
}
