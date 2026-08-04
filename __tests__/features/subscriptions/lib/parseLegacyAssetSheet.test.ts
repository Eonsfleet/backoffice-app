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
    const future = '2999-01-01'
    const res = await parseLegacyAssetSheet(csvFile(
      `${HEADER}\n${future},ABC-123-XY,80\n2020-01-15,SHORT,80\n2020-01-15,GOOD-REG-1,0\nnot-a-date,GOOD-REG-2,5\n`,
    ))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.rows[0].errors.join(' ')).toMatch(/future/i)
    expect(res.rows[1].errors.join(' ')).toMatch(/at least 6/i)
    expect(res.rows[2].errors.join(' ')).toMatch(/at least 1/i)
    expect(res.rows[3].errors.join(' ')).toMatch(/valid date/i)
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
})
