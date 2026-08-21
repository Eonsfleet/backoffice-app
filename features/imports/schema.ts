/**
 * What each admin import sheet may contain, mirrored from the backend's
 * App\Services\Import\ImportSchema.
 *
 * Kept in one place because the guidance shown beside the upload box is the only
 * thing standing between an operator and a rejected sheet: imports are
 * all-or-nothing, so one wrongly-labelled column fails the entire file. The device
 * form previously claimed all four of its columns were required when only IMEI is,
 * which is exactly the kind of drift this table exists to stop.
 */

export type ImportModule = 'vehicle' | 'device' | 'user'

export interface ImportColumn {
  /** Header as it must appear in the sheet. */
  name: string
  /** Rejected if missing or empty on any row. */
  required?: boolean
  /** Repeats within the file, or a clash with an existing record, fail the import. */
  unique?: boolean
  /** Short qualifier shown after the column name. */
  note?: string
}

export interface ImportModuleSpec {
  /** Plural noun used in progress copy ("42 vehicles imported"). */
  label: string
  /** Singular of `label`, for the one-record case. */
  singular: string
  columns: ImportColumn[]
}

export const IMPORT_SCHEMA: Record<ImportModule, ImportModuleSpec> = {
  vehicle: {
    label: 'vehicles',
    singular: 'vehicle',
    columns: [
      { name: 'Registration No.', required: true, unique: true },
      { name: 'Make' },
      { name: 'Model' },
      { name: 'Year', note: 'number' },
      { name: 'Display No.' },
      { name: 'Chassis No.' },
      { name: 'Body Type' },
      { name: 'Vehicle Type' },
      { name: 'Color' },
      { name: 'Fuel Type' },
      { name: 'Onboarded Date', note: 'future dates allowed' },
      { name: 'Device ID', note: 'IMEI of an existing device' },
      { name: 'Cluster Name' },
      { name: 'Driver Email' },
    ],
  },
  device: {
    label: 'devices',
    singular: 'device',
    columns: [
      { name: 'IMEI', required: true, unique: true },
      { name: 'Hardware Name', note: 'must match a configured hardware model' },
      { name: 'Phone Number' },
      { name: 'Country' },
    ],
  },
  user: {
    label: 'users',
    singular: 'user',
    columns: [
      { name: 'Email', required: true, unique: true },
      { name: 'First Name', required: true },
      { name: 'Last Name' },
      { name: 'Phone' },
      { name: 'Employee No.' },
      { name: 'Role' },
    ],
  },
}

export function requiredColumns(module: ImportModule): ImportColumn[] {
  return IMPORT_SCHEMA[module].columns.filter((c) => c.required)
}

export function optionalColumns(module: ImportModule): ImportColumn[] {
  return IMPORT_SCHEMA[module].columns.filter((c) => !c.required)
}
