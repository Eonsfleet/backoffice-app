import { describe, it, expect } from 'vitest'
import { parseLegacyAssetSheet } from '@/features/subscriptions/lib/parseLegacyAssetSheet'

function csvFile(content: string): File {
  return new File([content], 'assets.csv', { type: 'text/csv' })
}

async function xlsxFile(rows: (string | number | Date)[][]): Promise<File> {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')
  rows.forEach((r) => ws.addRow(r))
  const buf = await wb.xlsx.writeBuffer()
  return new File([buf], 'assets.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

const HEADER = 'onboarded_date,registration_number,fuel_capacity'

describe('parseLegacyAssetSheet', () => {
  it('parses a valid CSV into normalized rows', async () => {
    const res = await parseLegacyAssetSheet(csvFile(`${HEADER}\n2020-01-15,ABC-123-XY,80\n2019-06-01,XYZ-987-AB,100\n`))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0].errors).toEqual([])
    expect(res.rows[0].data).toMatchObject({ onboarded_date: '2020-01-15', registration_number: 'ABC-123-XY', fuel_capacity: 80 })
    expect(typeof res.rows[0].data.fuel_capacity).toBe('number')
  })

  it('recognizes header aliases and trims/normalizes them', async () => {
    const res = await parseLegacyAssetSheet(csvFile(`Onboarded Date,Reg No,Fuel Capacity\n2020-01-15,ABC-123-XY,80\n`))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors).toEqual([])
    expect(res.rows[0].data.registration_number).toBe('ABC-123-XY')
  })

  it('returns a file-level error when a required column is missing', async () => {
    const res = await parseLegacyAssetSheet(csvFile(`onboarded_date,fuel_capacity\n2020-01-15,80\n`))
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('registration_number')
  })

  it('flags row-level validation problems', async () => {
    const res = await parseLegacyAssetSheet(csvFile(
      `${HEADER}\n2020-01-15,SHORT,80\n2020-01-15,GOOD-REG-1,0\nnot-a-date,GOOD-REG-2,5\n`,
    ))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors.join(' ')).toMatch(/at least 6/i)
    expect(res.rows[1].errors.join(' ')).toMatch(/at least 1/i)
    expect(res.rows[2].errors.join(' ')).toMatch(/valid date/i)
  })

  // Fleets load vehicles ahead of the date they go live, so a future onboarded
  // date must parse cleanly rather than being flagged.
  it('accepts a future onboarded date', async () => {
    const future = '2999-01-01'
    const res = await parseLegacyAssetSheet(csvFile(`${HEADER}\n${future},ABC-123-XY,80\n`))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors).toEqual([])
    expect(res.rows[0].data.onboarded_date).toBe(future)
  })

  it('flags duplicate registration numbers within the file', async () => {
    const res = await parseLegacyAssetSheet(csvFile(`${HEADER}\n2020-01-15,DUP-REG-1,80\n2019-01-01,dup-reg-1,90\n`))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors.join(' ')).toMatch(/duplicate/i)
    expect(res.rows[1].errors.join(' ')).toMatch(/duplicate/i)
  })

  it('parses optional columns and validates type/year', async () => {
    const res = await parseLegacyAssetSheet(csvFile(
      `${HEADER},type,year,make\n2020-01-15,ABC-123-XY,80,truck,2020,Toyota\n2020-01-15,ABC-123-ZZ,80,spaceship,1800,Toyota\n`,
    ))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors).toEqual([])
    expect(res.rows[0].data).toMatchObject({ type: 'truck', year: 2020, make: 'Toyota' })
    expect(res.rows[1].errors.join(' ')).toMatch(/type must be one of/i)
    expect(res.rows[1].errors.join(' ')).toMatch(/1900 and 2050/i)
  })

  it('handles quoted CSV fields containing commas', async () => {
    const res = await parseLegacyAssetSheet(csvFile(`${HEADER},color\n2020-01-15,ABC-123-XY,80,"Black, matte"\n`))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].data.color).toBe('Black, matte')
    expect(res.rows[0].errors).toEqual([])
  })

  it('parses an .xlsx file including native date cells', async () => {
    const file = await xlsxFile([
      ['onboarded_date', 'registration_number', 'fuel_capacity'],
      [new Date(Date.UTC(2020, 0, 15)), 'ABC-123-XY', 80],
    ])
    const res = await parseLegacyAssetSheet(file)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].data.onboarded_date).toBe('2020-01-15')
    expect(res.rows[0].data.fuel_capacity).toBe(80)
    expect(res.rows[0].errors).toEqual([])
  })

  it('returns a file-level error for an empty sheet', async () => {
    const res = await parseLegacyAssetSheet(csvFile(''))
    expect(res.ok).toBe(false)
  })

  it('rejects unsupported file extensions', async () => {
    const res = await parseLegacyAssetSheet(new File(['x'], 'notes.txt', { type: 'text/plain' }))
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toMatch(/\.csv or \.xlsx/i)
  })

  it('recognizes punctuation headers and maps Body Type to type + body_type', async () => {
    const res = await parseLegacyAssetSheet(csvFile(
      'Make,Model,Year,Registration No.,Display No.,Chassis No.,Body Type,Vehicle Type,Color,Fuel Type,Device ID,Cluster Name,Driver Email,Onboarded Date\n' +
      'TVS,3 Wheeler,2026,MUS422QS,SUBCITY-ABJ-192,MD2A25BX5TWJ66239,Keke,Commercial,Yellow,Petrol,358657106476158,Abuja,driver@company.com,2026-03-15\n',
    ))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors).toEqual([])
    expect(res.rows[0].data).toMatchObject({
      make: 'TVS', model: '3 Wheeler', year: 2026, registration_number: 'MUS422QS',
      display_number: 'SUBCITY-ABJ-192', chasis_number: 'MD2A25BX5TWJ66239',
      type: 'tricycle', body_type: 'Keke', vehicle_category: 'Commercial', color: 'Yellow', fuel_type: 'Petrol',
      device_id: '358657106476158', cluster_name: 'Abuja', driver_email: 'driver@company.com',
      onboarded_date: '2026-03-15',
    })
  })

  it('flags an unrecognized Body Type and a malformed driver email', async () => {
    const res = await parseLegacyAssetSheet(csvFile(
      'Registration No.,Onboarded Date,Body Type,Driver Email\n' +
      'ABC-123-XY,2020-01-15,spaceship,not-an-email\n',
    ))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors.join(' ')).toMatch(/body type/i)
    expect(res.rows[0].errors.join(' ')).toMatch(/email/i)
  })

  it('recognizes template headers that carry parenthetical annotations', async () => {
    const res = await parseLegacyAssetSheet(csvFile(
      'Make,Model,Year,Registration No.,Display No.,Chassis No.,Body Type,Vehicle Type,Color,Fuel Type,Device ID (optional),Cluster Name (optional),Driver Email (optional),"Onboarded Date (optional, required for migration imports)"\n' +
      'TVS,3 Wheeler,2026,MUS422QS,SUBCITY-ABJ-192,MD2A25BX5TWJ66239,Keke,Commercial,Yellow,Petrol,358657106476158,Abuja,driver@company.com,2026-03-15\n',
    ))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors).toEqual([])
    expect(res.rows[0].data).toMatchObject({
      registration_number: 'MUS422QS', onboarded_date: '2026-03-15', type: 'tricycle',
      device_id: '358657106476158', cluster_name: 'Abuja', driver_email: 'driver@company.com',
    })
  })

  it('handles a real Excel export: unquoted comma in annotated header, M/D/YYYY date, trailing comma', async () => {
    const csv =
      'Make,Model,Year,Registration No.,Display No.,Chassis No.,Body Type,Vehicle Type,Color,Fuel Type,Device ID (optional),Cluster Name (optional),Driver Email (optional),Onboarded Date (optional, required for migration imports)\n' +
      'TVS,3 Wheeler,2026,MUS422QS,SUBCITY-ABJ-192,MD2A25BX5TWJ66239,Keke,Commercial,Yellow,Petrol,358657106476158,Abuja,driver@company.com,3/15/2026,\n'
    const res = await parseLegacyAssetSheet(csvFile(csv))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].data.onboarded_date).toBe('2026-03-15')
    expect(res.rows[0].data.registration_number).toBe('MUS422QS')
    expect(res.rows[0].data.type).toBe('tricycle')
  })

  it('parses M/D/YYYY, D/M/YYYY (via >12 disambiguation), and ISO dates', async () => {
    const res = await parseLegacyAssetSheet(csvFile(
      'Registration No.,Onboarded Date\nAAA-111,3/15/2026\nBBB-222,15/03/2026\nCCC-333,2026-03-15\n',
    ))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows.map((r) => r.data.onboarded_date)).toEqual(['2026-03-15', '2026-03-15', '2026-03-15'])
  })

  it('no longer requires fuel_capacity', async () => {
    const res = await parseLegacyAssetSheet(csvFile('Registration No.,Onboarded Date\nABC-123-XY,2020-01-15\n'))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors).toEqual([])
  })
})
