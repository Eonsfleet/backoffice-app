import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Vehicle } from '@/types/api'

vi.mock('@/features/organizations/api', () => ({ listOrganizations: vi.fn().mockResolvedValue({ data: [{ id: 1, identifier: 'org-1', name: 'Acme Logistics' }], meta: {} }) }))

import { VehicleFormFields } from '@/features/vehicles/components/VehicleFormFields'

// jsdom has no ResizeObserver, which Radix measures with.
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

const vehicle = (fuelEstimation?: Vehicle['fuel_estimation']): Vehicle => ({
  id: 7, plate_number: 'LAG-123-XY', make: 'Toyota', model: 'Hilux', year: 2019, color: 'White', body_type: 'Pickup', fuel_type: 'Diesel',
  fuel_capacity: 80, fuel_capacity_unit: 'L', status: 'active', fuel_estimation: fuelEstimation,
  organization: { id: 1, name: 'Acme Logistics', identifier: 'org-1' },
} as Vehicle)

function renderForm(props: { vehicle?: Vehicle | null; onSubmit?: (v: unknown) => void } = {}) {
  const onSubmit = props.onSubmit ?? vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <VehicleFormFields vehicle={props.vehicle} onSubmit={onSubmit} isPending={false} onCancel={vi.fn()} />
    </QueryClientProvider>,
  )
  return onSubmit
}

describe('the vehicle form’s fuel estimation fields', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows the vehicle’s own rates and sends them as numbers', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({ vehicle: vehicle({ enabled: true, liters_per_100km: 12.5, idle_liters_per_hour: 1.3 }) })

    expect(screen.getByLabelText('Consumption (L/100 km)')).toHaveValue(12.5)
    expect(screen.getByLabelText('Idle burn (L/hour)')).toHaveValue(1.3)
    expect(screen.getByRole('switch', { name: 'Estimate fuel use' })).toBeChecked()

    await user.clear(screen.getByLabelText('Consumption (L/100 km)'))
    await user.type(screen.getByLabelText('Consumption (L/100 km)'), '14.2')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({ fuel_estimation_enabled: true, estimated_liters_per_100km: 14.2, estimated_idle_liters_per_hour: 1.3 })
  })

  it('sends null for a rate left blank, so a rate that was set can be cleared', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({ vehicle: vehicle({ enabled: true, liters_per_100km: 12.5, idle_liters_per_hour: 1.3 }) })

    await user.clear(screen.getByLabelText('Consumption (L/100 km)'))
    await user.clear(screen.getByLabelText('Idle burn (L/hour)'))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({ estimated_liters_per_100km: null, estimated_idle_liters_per_hour: null, fuel_estimation_enabled: true })
  })

  it('refuses a rate the API would refuse, and sends nothing', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({ vehicle: vehicle() })

    await user.type(screen.getByLabelText('Consumption (L/100 km)'), '501')
    await user.type(screen.getByLabelText('Idle burn (L/hour)'), '0')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Consumption must be 500 or less.')).toBeInTheDocument()
    expect(screen.getByText('Idle burn must be a number above 0.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('turning estimation off disables the rate fields and is sent as off', async () => {
    const user = userEvent.setup()
    const onSubmit = renderForm({ vehicle: vehicle({ enabled: true, liters_per_100km: 9, idle_liters_per_hour: null }) })

    await user.click(screen.getByRole('switch', { name: 'Estimate fuel use' }))
    expect(screen.getByLabelText('Consumption (L/100 km)')).toBeDisabled()
    expect(screen.getByLabelText('Idle burn (L/hour)')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(vi.mocked(onSubmit).mock.calls[0][0]).toMatchObject({ fuel_estimation_enabled: false, estimated_liters_per_100km: 9 })
  })

  it('a new vehicle starts with estimation on and no rates', async () => {
    renderForm()

    expect(screen.getByRole('switch', { name: 'Estimate fuel use' })).toBeChecked()
    expect(screen.getByLabelText('Consumption (L/100 km)')).toHaveValue(null)
    expect(screen.getByLabelText('Idle burn (L/hour)')).toHaveValue(null)
  })
})
