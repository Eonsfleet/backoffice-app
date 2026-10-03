import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '@/components/shared/DataTable'

describe('shared records table', () => {
  it('supports keyboard sorting and exposes sort direction to assistive technology', async () => {
    const user = userEvent.setup()
    render(<DataTable data={[{ amount: 2 }, { amount: 1 }]} columns={[{ accessorKey: 'amount', header: 'Amount' }]} />)
    const button = screen.getByRole('button', { name: 'Amount' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('status')).toHaveTextContent('within this page')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'ascending')
  })
  it('preserves filter controls when a request fails', () => {
    render(<DataTable data={[]} columns={[{ accessorKey: 'name', header: 'Name' }]} toolbar={<button>Reset filters</button>} error={{ response: { status: 500 } }} />)
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
