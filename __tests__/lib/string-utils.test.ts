import { describe, it, expect } from 'vitest'
import { getInitials } from '@/lib/string-utils'

describe('getInitials', () => {
  it('returns initials from a two-word name', () => {
    expect(getInitials('Jane Doe')).toBe('JD')
  })

  it('returns a single initial from a one-word name', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  it('handles names with extra whitespace', () => {
    expect(getInitials('  Bob   Smith  ')).toBe('BS')
  })

  it('returns at most 2 characters for long names', () => {
    expect(getInitials('Jean-Paul Van Damme')).toBe('JV')
  })

  it('returns ? for an empty string', () => {
    expect(getInitials('')).toBe('?')
  })

  it('returns ? for a whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?')
  })

  it('returns ? for undefined', () => {
    expect(getInitials(undefined)).toBe('?')
  })

  it('returns ? for null', () => {
    expect(getInitials(null)).toBe('?')
  })

  it('uppercases the result', () => {
    expect(getInitials('john doe')).toBe('JD')
  })
})
