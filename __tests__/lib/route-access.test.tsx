import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouteAccess } from '@/components/layout/RouteAccess'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminUser } from '@/types/api'

vi.mock('next/navigation', () => ({ usePathname: () => '/devices', useSearchParams: () => new URLSearchParams() }))
const user = (role: string): AdminUser => ({ id: '1', name: 'Test', email: 'test@example.com', role, avatar: null, last_login: null })

describe('direct route protection', () => {
  beforeEach(() => useAuthStore.setState({ token: null, user: null, isBootstrapping: false }))
  it('does not mount the workspace or its queries for an unauthorized role', () => {
    const mount = vi.fn()
    function Workspace() { mount(); return <p>Device workspace</p> }
    useAuthStore.setState({ user: user('finance'), token: 'test' })
    render(<RouteAccess><Workspace /></RouteAccess>)
    expect(mount).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission')
  })
  it('waits for the authoritative profile before mounting children', () => {
    useAuthStore.setState({ isBootstrapping: true, token: 'test' })
    render(<RouteAccess><p>Device workspace</p></RouteAccess>)
    expect(screen.queryByText('Device workspace')).toBeNull()
  })
  it('mounts the authorized device workspace', () => {
    useAuthStore.setState({ user: user('installer'), token: 'test' })
    render(<RouteAccess><p>Device workspace</p></RouteAccess>)
    expect(screen.getByText('Device workspace')).toBeInTheDocument()
  })
})
