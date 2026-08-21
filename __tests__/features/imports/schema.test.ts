import { describe, it, expect } from 'vitest'
import {
  IMPORT_SCHEMA,
  optionalColumns,
  requiredColumns,
  type ImportModule,
} from '@/features/imports/schema'

const MODULES: ImportModule[] = ['vehicle', 'device', 'user']

/**
 * These assertions mirror App\Services\Import\ImportSchema::requiredFields() and
 * ::uniqueKey(). Imports are all-or-nothing, so if this table overstates what is
 * required the operator pads columns they don't need, and if it understates it
 * their sheet is rejected wholesale with no warning from the UI.
 *
 * The device form previously listed all four of its columns as required when only
 * IMEI is — that regression is what these tests exist to catch.
 */
describe('import schema', () => {
  it('marks exactly the backend-required columns as required', () => {
    expect(requiredColumns('vehicle').map((c) => c.name)).toEqual(['Registration No.'])
    expect(requiredColumns('device').map((c) => c.name)).toEqual(['IMEI'])
    expect(requiredColumns('user').map((c) => c.name)).toEqual(['Email', 'First Name'])
  })

  it('marks the business key of each module as unique', () => {
    const uniqueFor = (m: ImportModule) =>
      IMPORT_SCHEMA[m].columns.filter((c) => c.unique).map((c) => c.name)

    expect(uniqueFor('vehicle')).toEqual(['Registration No.'])
    expect(uniqueFor('device')).toEqual(['IMEI'])
    expect(uniqueFor('user')).toEqual(['Email'])
  })

  it('does not list Hardware Name, Phone Number or Country as required for devices', () => {
    const optional = optionalColumns('device').map((c) => c.name)
    expect(optional).toContain('Hardware Name')
    expect(optional).toContain('Phone Number')
    expect(optional).toContain('Country')
  })

  it('offers Onboarded Date for vehicles and says future dates are allowed', () => {
    const onboarded = IMPORT_SCHEMA.vehicle.columns.find((c) => c.name === 'Onboarded Date')
    expect(onboarded).toBeDefined()
    expect(onboarded?.note).toMatch(/future/i)
  })

  it.each(MODULES)('gives %s a label, a singular and a non-empty column list', (module) => {
    const spec = IMPORT_SCHEMA[module]
    expect(spec.label).toBeTruthy()
    expect(spec.singular).toBeTruthy()
    expect(spec.label).not.toBe(spec.singular)
    expect(spec.columns.length).toBeGreaterThan(0)
  })

  it.each(MODULES)('has no duplicate column names for %s', (module) => {
    const names = IMPORT_SCHEMA[module].columns.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it.each(MODULES)('splits %s columns cleanly into required and optional', (module) => {
    const total = IMPORT_SCHEMA[module].columns.length
    expect(requiredColumns(module).length + optionalColumns(module).length).toBe(total)
  })
})
