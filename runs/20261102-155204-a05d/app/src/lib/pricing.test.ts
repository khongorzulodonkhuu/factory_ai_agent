import { describe, it, expect } from 'vitest'
import { rentalDays, calcTotal, priceBreakdown, isValidRange, addDaysISO, timeOptions } from './pricing'

describe('rentalDays', () => {
  it('counts calendar days between pickup and return', () => {
    expect(rentalDays('2025-07-10', '2025-07-13')).toBe(3)
  })
  it('counts across a month boundary', () => {
    expect(rentalDays('2025-07-30', '2025-08-02')).toBe(3)
  })
})

describe('calcTotal', () => {
  it('computes Days x Daily Rate + Cleaning Fee', () => {
    expect(calcTotal(3, 85, 25)).toBe(280)
  })
  it('handles a zero cleaning fee', () => {
    expect(calcTotal(2, 38, 0)).toBe(76)
  })
})

describe('priceBreakdown', () => {
  it('returns days, rate, fee and total for the spec example', () => {
    const car = { dailyRate: 85, cleaningFee: 25 }
    expect(priceBreakdown(car, '2025-07-10', '2025-07-13')).toEqual({ days: 3, dailyRate: 85, cleaningFee: 25, total: 280 })
  })
})

describe('isValidRange', () => {
  it('is true when return is after pickup', () => {
    expect(isValidRange('2025-07-10', '2025-07-13')).toBe(true)
  })
  it('is false when return equals pickup', () => {
    expect(isValidRange('2025-07-10', '2025-07-10')).toBe(false)
  })
  it('is false when return is before pickup', () => {
    expect(isValidRange('2025-07-10', '2025-07-09')).toBe(false)
  })
})

describe('addDaysISO', () => {
  it('adds days to an ISO date', () => {
    expect(addDaysISO('2025-07-10', 3)).toBe('2025-07-13')
  })
  it('rolls over month end', () => {
    expect(addDaysISO('2025-07-31', 1)).toBe('2025-08-01')
  })
})

describe('timeOptions', () => {
  it('includes the 10:00 default', () => {
    expect(timeOptions()).toContain('10:00')
  })
  it('uses 30-minute steps', () => {
    const t = timeOptions()
    const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
    expect(t.slice(1).every((v, i) => toMin(v) - toMin(t[i]) === 30)).toBe(true)
  })
})
