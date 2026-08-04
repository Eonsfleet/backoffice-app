import type { ImportLegacyAssetsPayload } from '@/features/subscriptions/api'

export type LegacyVehicleInput = ImportLegacyAssetsPayload['vehicles'][number]

export interface ParsedRow {
  index: number
  data: LegacyVehicleInput
  errors: string[]
}

export type ParseResult =
  | { ok: true; rows: ParsedRow[] }
  | { ok: false; error: string }

const VEHICLE_TYPES = ['car', 'van', 'truck', 'bus', 'motorcycle', 'tricycle']

const REQUIRED: Array<keyof LegacyVehicleInput> = ['onboarded_date', 'registration_number', 'fuel_capacity']

// normalized header (lowercase, underscores/spaces collapsed to single space) → canonical key
const HEADER_ALIASES: Record<string, keyof LegacyVehicleInput> = {
  'onboarded date': 'onboarded_date',
  'onboard date': 'onboarded_date',
  'onboarding date': 'onboarded_date',
  'date onboarded': 'onboarded_date',
  registration: 'registration_number',
  'registration number': 'registration_number',
  'reg no': 'registration_number',
  reg: 'registration_number',
  plate: 'registration_number',
  'plate number': 'registration_number',
  'fuel capacity': 'fuel_capacity',
  capacity: 'fuel_capacity',
  'tank capacity': 'fuel_capacity',
  make: 'make',
  model: 'model',
  type: 'type',
  color: 'color',
  colour: 'color',
  'fuel type': 'fuel_type',
  'chasis number': 'chasis_number',
  'chassis number': 'chasis_number',
  chasis: 'chasis_number',
  chassis: 'chasis_number',
  'display number': 'display_number',
  year: 'year',
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[_\s]+/g, ' ')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function buildIso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${y}-${pad(mo)}-${pad(d)}`
}

function parseDateToIso(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/) // ISO / YYYY-first
  if (m) return buildIso(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/) // day-first DD-MM-YYYY
  if (m) return buildIso(+m[3], +m[2], +m[1])
  return null
}

/** Coerce any exceljs / CSV cell value to a trimmed string. */
function cellToString(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return formatUtcDate(value)
  if (typeof value === 'object') {
    const v = value as { text?: unknown; result?: unknown; richText?: Array<{ text: string }> }
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('').trim()
    if (v.text != null) return String(v.text).trim()
    if (v.result != null) return cellToString(v.result)
    return ''
  }
  return String(value).trim()
}

/** Read a File as text via FileReader (works in browsers and jsdom, unlike Blob.text()). */
function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/** Read a File as an ArrayBuffer via FileReader (works in browsers and jsdom). */
function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, commas, CRLF/LF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  let i = 0
  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    rows.push(row)
    row = []
  }
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      pushField()
      i++
      continue
    }
    if (c === '\r') {
      i++
      continue
    }
    if (c === '\n') {
      pushField()
      pushRow()
      i++
      continue
    }
    field += c
    i++
  }
  if (field.length > 0 || row.length > 0) {
    pushField()
    pushRow()
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

async function readXlsx(file: File): Promise<string[][]> {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await readArrayBuffer(file))
  const ws = wb.worksheets[0]
  if (!ws) return []
  const matrix: string[][] = []
  ws.eachRow({ includeEmpty: false }, (r) => {
    const values = Array.isArray(r.values) ? r.values.slice(1) : [] // exceljs values are 1-based
    matrix.push(values.map(cellToString))
  })
  return matrix.filter((r) => r.some((cell) => cell.trim() !== ''))
}

export async function parseLegacyAssetSheet(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase()
  let matrix: string[][]
  try {
    if (name.endsWith('.csv')) {
      matrix = parseCsv(await readText(file))
    } else if (name.endsWith('.xlsx')) {
      matrix = await readXlsx(file)
    } else {
      return { ok: false, error: 'Unsupported file. Upload a .csv or .xlsx file.' }
    }
  } catch {
    return { ok: false, error: "Couldn't read this file. Upload a .csv or .xlsx exported from your spreadsheet." }
  }

  if (matrix.length === 0) return { ok: false, error: 'No vehicle rows found in the file.' }

  const colMap = new Map<number, keyof LegacyVehicleInput>()
  matrix[0].forEach((h, idx) => {
    const canonical = HEADER_ALIASES[normalizeHeader(h)]
    if (canonical) colMap.set(idx, canonical)
  })

  const present = new Set(colMap.values())
  const missing = REQUIRED.filter((k) => !present.has(k))
  if (missing.length) return { ok: false, error: `Missing required column(s): ${missing.join(', ')}.` }

  const dataRows = matrix.slice(1)
  if (dataRows.length === 0) return { ok: false, error: 'No vehicle rows found in the file.' }

  const fieldRows = dataRows.map((cells) => {
    const fields: Partial<Record<keyof LegacyVehicleInput, string>> = {}
    colMap.forEach((key, idx) => {
      fields[key] = (cells[idx] ?? '').trim()
    })
    return fields
  })

  const regCounts = new Map<string, number>()
  for (const f of fieldRows) {
    const reg = (f.registration_number ?? '').toLowerCase()
    if (reg) regCounts.set(reg, (regCounts.get(reg) ?? 0) + 1)
  }

  const rows: ParsedRow[] = fieldRows.map((fields, i) => {
    const errors: string[] = []
    const data: LegacyVehicleInput = { onboarded_date: '', registration_number: '', fuel_capacity: 0 }

    const iso = parseDateToIso(fields.onboarded_date ?? '')
    if (!fields.onboarded_date) errors.push('onboarded_date is required')
    else if (!iso) errors.push('onboarded_date is not a valid date (use YYYY-MM-DD)')
    else if (iso > todayIso()) errors.push('onboarded_date cannot be in the future')
    else data.onboarded_date = iso

    const reg = fields.registration_number ?? ''
    if (!reg) errors.push('registration_number is required')
    else if (reg.length < 6) errors.push('registration_number must be at least 6 characters')
    else if (reg.length > 255) errors.push('registration_number is too long')
    else {
      data.registration_number = reg
      if ((regCounts.get(reg.toLowerCase()) ?? 0) > 1) errors.push('duplicate registration_number in file')
    }

    const fcRaw = fields.fuel_capacity ?? ''
    const fc = Number(fcRaw)
    if (!fcRaw) errors.push('fuel_capacity is required')
    else if (!Number.isFinite(fc)) errors.push('fuel_capacity must be a number')
    else if (fc < 1) errors.push('fuel_capacity must be at least 1')
    else data.fuel_capacity = fc

    for (const k of ['make', 'model'] as const) {
      const v = fields[k]
      if (v) {
        if (v.length < 3) errors.push(`${k} must be at least 3 characters`)
        else if (v.length > 255) errors.push(`${k} is too long`)
        else data[k] = v
      }
    }

    if (fields.type) {
      const t = fields.type.toLowerCase()
      if (!VEHICLE_TYPES.includes(t)) errors.push(`type must be one of: ${VEHICLE_TYPES.join(', ')}`)
      else data.type = t
    }

    if (fields.color) data.color = fields.color
    if (fields.fuel_type) data.fuel_type = fields.fuel_type

    for (const k of ['chasis_number', 'display_number'] as const) {
      const v = fields[k]
      if (v) {
        if (v.length > 255) errors.push(`${k} is too long`)
        else data[k] = v
      }
    }

    if (fields.year) {
      const y = Number(fields.year)
      if (!Number.isInteger(y) || y < 1900 || y > 2050) errors.push('year must be between 1900 and 2050')
      else data.year = y
    }

    return { index: i + 1, data, errors }
  })

  return { ok: true, rows }
}
