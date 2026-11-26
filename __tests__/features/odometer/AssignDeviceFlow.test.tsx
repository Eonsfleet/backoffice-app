import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Vehicle } from '@/types/api'

vi.mock('@/lib/api/client', () => ({ api: {} }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/devices/api', () => ({
  listDevices: vi.fn().mockResolvedValue({ data: [{ id: 1, device_id: '356938035643809', hardware: null, organization: null, vehicle: null }], meta: {} }),
}))
vi.mock('@/features/devices/components/DeviceCreateForm', () => ({ DeviceCreateForm: () => null }))
const assign = vi.fn()
vi.mock('@/features/vehicles/api', () => ({ assignDeviceToVehicle: (...a: unknown[]) => assign(...a) }))
const submit = vi.fn()
vi.mock('@/features/odometer/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/odometer/api')>()),
  submitInstallerReading: (...a: unknown[]) => submit(...a),
  skipInstallerReading: vi.fn(),
}))

import { AssignDeviceForm } from '@/features/vehicles/components/AssignDeviceForm'

beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }) })

const vehicle = { id: 7, plate_number: 'ABC-123', device_id: null, status: 'active', organization: { id: 1, name: 'Acme', identifier: 'org-1' } } as unknown as Vehicle

describe('installation flow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prompts for the dashboard reading after the device is assigned, and finishing needs no reading', async () => {
    const person = userEvent.setup()
    assign.mockResolvedValue(vehicle)
    const onSuccess = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AssignDeviceForm vehicle={vehicle} onSuccess={onSuccess} onCancel={vi.fn()} />
      </QueryClientProvider>,
    )
    await person.type(screen.getByLabelText('Device IMEI'), '356938035643809')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Assign Device' })).toBeEnabled())
    await person.click(screen.getByRole('button', { name: 'Assign Device' }))

    expect(await screen.findByText('Dashboard reading for ABC-123')).toBeInTheDocument()
    // The assignment alone does not close the panel: the prompt comes first.
    expect(onSuccess).not.toHaveBeenCalled()
    await person.click(screen.getByRole('button', { name: 'Finish installation without a reading' }))
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(submit).not.toHaveBeenCalled()
  })
})
