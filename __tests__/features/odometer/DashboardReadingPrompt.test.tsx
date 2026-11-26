import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/api/client', () => ({ api: {} }))
const submit = vi.fn()
const skip = vi.fn()
vi.mock('@/features/odometer/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/odometer/api')>()),
  submitInstallerReading: (...a: unknown[]) => submit(...a),
  skipInstallerReading: (...a: unknown[]) => skip(...a),
}))

import { DashboardReadingPrompt } from '@/features/odometer/components/DashboardReadingPrompt'

function show(orgId: string | number | null = 'org-1') {
  const onFinish = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DashboardReadingPrompt orgId={orgId} vehicleId={7} plate="ABC-123" onFinish={onFinish} />
    </QueryClientProvider>,
  )
  return onFinish
}

describe('installer dashboard reading prompt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('submits the reading with unit and the inspection flag', async () => {
    const person = userEvent.setup()
    submit.mockResolvedValue({ outcome: 'pending_sync' })
    const onFinish = show()
    await person.type(screen.getByLabelText('Dashboard reading'), '52340')
    await person.selectOptions(screen.getByLabelText('Unit'), 'mi')
    await person.click(screen.getByLabelText('I physically inspected the dashboard'))
    await person.click(screen.getByRole('button', { name: 'Save reading' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith('org-1', 7, { value: 52340, unit: 'mi', physically_inspected: true }))
    expect(await screen.findByTestId('reading-done')).toHaveTextContent(/takes effect once the tracking system confirms/)
    await person.click(screen.getByRole('button', { name: 'Finish' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('does not inspect-flag a reading unless the box is ticked', async () => {
    const person = userEvent.setup()
    submit.mockResolvedValue({ outcome: 'accepted' })
    show()
    await person.type(screen.getByLabelText('Dashboard reading'), '100')
    await person.click(screen.getByRole('button', { name: 'Save reading' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith('org-1', 7, { value: 100, unit: 'km', physically_inspected: false }))
  })

  it('never sends an empty reading', async () => {
    const person = userEvent.setup()
    show()
    await person.click(screen.getByRole('button', { name: 'Save reading' }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter the dashboard reading/)
  })

  it('records that the dashboard could not be read, with a reason', async () => {
    const person = userEvent.setup()
    skip.mockResolvedValue(undefined)
    show()
    await person.click(screen.getByRole('button', { name: 'I could not read the dashboard' }))
    await person.selectOptions(screen.getByLabelText('Why not?'), 'locked_vehicle')
    await person.click(screen.getByRole('button', { name: 'Record and continue' }))
    await waitFor(() => expect(skip).toHaveBeenCalledWith('org-1', 7, { reason: 'locked_vehicle', note: null }))
    expect(submit).not.toHaveBeenCalled()
    expect(await screen.findByTestId('reading-done')).toBeInTheDocument()
  })

  it('never blocks finishing, even when the reading call fails', async () => {
    const person = userEvent.setup()
    submit.mockRejectedValue({ response: { status: 403, data: { message: 'Not permitted' } } })
    const onFinish = show()
    await person.type(screen.getByLabelText('Dashboard reading'), '100')
    await person.click(screen.getByRole('button', { name: 'Save reading' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Not permitted')
    await person.click(screen.getByRole('button', { name: 'Finish installation without a reading' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('can be finished straight away without entering anything', async () => {
    const person = userEvent.setup()
    const onFinish = show()
    await person.click(screen.getByRole('button', { name: 'Finish installation without a reading' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(submit).not.toHaveBeenCalled()
    expect(skip).not.toHaveBeenCalled()
  })

  it('still lets the installer finish when the organization is unknown', async () => {
    const person = userEvent.setup()
    const onFinish = show(null)
    expect(screen.queryByRole('button', { name: 'Save reading' })).toBeNull()
    await person.click(screen.getByRole('button', { name: 'Finish installation without a reading' }))
    expect(onFinish).toHaveBeenCalled()
  })
})
