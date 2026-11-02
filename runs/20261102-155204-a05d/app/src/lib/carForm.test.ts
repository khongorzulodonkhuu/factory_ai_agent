import { describe, it, expect } from 'vitest'
import { emptyDraft, validateCarDraft, draftToCarInput } from './carForm'
import type { CarDraft } from '../types'

function filled(overrides: Partial<CarDraft> = {}): CarDraft {
  return {
    ...emptyDraft(),
    make: 'Mazda',
    model: 'CX-5',
    year: '2022',
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    dailyRate: '75',
    cleaningFee: '20',
    imageUrl: 'https://example.com/car.jpg',
    locationType: 'City',
    locationName: 'Ulaanbaatar - Khan-Uul',
    pickupAddress: 'Khan-Uul District, Ulaanbaatar, Mongolia',
    ...overrides,
  }
}

describe('emptyDraft', () => {
  it('starts with the documented defaults', () => {
    const d = emptyDraft()
    expect(d.bodyType).toBe('Sedan')
    expect(d.seats).toBe('5')
    expect(d.bags).toBe('2')
    expect(d.odometerKm).toBe('0')
    expect(d.mileagePolicy).toBe('Unlimited')
    expect(d.cleaningFee).toBe('0')
    expect(d.locationType).toBe('City')
  })

  it('leaves required text fields empty', () => {
    const d = emptyDraft()
    expect(d.make).toBe('')
    expect(d.model).toBe('')
    expect(d.imageUrl).toBe('')
    expect(d.locationName).toBe('')
  })
})

describe('validateCarDraft', () => {
  it('accepts a draft with only the required fields filled', () => {
    const errors = validateCarDraft(filled(), 2025)
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('flags empty required text fields as required', () => {
    const errors = validateCarDraft(filled({ make: '', model: '', imageUrl: '' }), 2025)
    expect(errors.make).toBe('required')
    expect(errors.model).toBe('required')
    expect(errors.imageUrl).toBe('required')
  })

  it('flags a missing fuel type', () => {
    const errors = validateCarDraft(filled({ fuelType: '' }), 2025)
    expect(errors.fuelType).toBe('required')
  })

  it('reports location-required when location type and name are missing', () => {
    const errors = validateCarDraft(filled({ locationType: '', locationName: '' }), 2025)
    expect(Object.values(errors)).toContain('location-required')
  })

  it('reports location-required when only the location name is missing', () => {
    const errors = validateCarDraft(filled({ locationName: '' }), 2025)
    expect(Object.values(errors)).toContain('location-required')
  })

  it('accepts years from 1990 through next year', () => {
    expect(validateCarDraft(filled({ year: '1990' }), 2025).year).toBeUndefined()
    expect(validateCarDraft(filled({ year: '2026' }), 2025).year).toBeUndefined()
  })

  it('rejects years outside 1990 through next year', () => {
    expect(validateCarDraft(filled({ year: '1989' }), 2025).year).toBe('year-range')
    expect(validateCarDraft(filled({ year: '2027' }), 2025).year).toBe('year-range')
  })

  it('requires a daily rate greater than 0', () => {
    expect(validateCarDraft(filled({ dailyRate: '0' }), 2025).dailyRate).toBe('rate-positive')
    expect(validateCarDraft(filled({ dailyRate: '-5' }), 2025).dailyRate).toBe('rate-positive')
    expect(validateCarDraft(filled({ dailyRate: '75' }), 2025).dailyRate).toBeUndefined()
  })

  it('requires a cleaning fee of 0 or more', () => {
    expect(validateCarDraft(filled({ cleaningFee: '-1' }), 2025).cleaningFee).toBe('fee-negative')
    expect(validateCarDraft(filled({ cleaningFee: '0' }), 2025).cleaningFee).toBeUndefined()
  })
})

describe('draftToCarInput', () => {
  it('converts numeric strings to numbers', () => {
    const input = draftToCarInput(
      filled({ year: '2022', seats: '7', bags: '4', odometerKm: '98000', dailyRate: '75', cleaningFee: '20' })
    )
    expect(input.year).toBe(2022)
    expect(input.seats).toBe(7)
    expect(input.bags).toBe(4)
    expect(input.odometerKm).toBe(98000)
    expect(input.dailyRate).toBe(75)
    expect(input.cleaningFee).toBe(20)
  })

  it('keeps text fields and location details', () => {
    const input = draftToCarInput(
      filled({ pickupInstructions: 'Call on arrival', mileagePolicy: '300 km/day' })
    )
    expect(input.make).toBe('Mazda')
    expect(input.model).toBe('CX-5')
    expect(input.fuelType).toBe('Gasoline')
    expect(input.transmission).toBe('Automatic')
    expect(input.locationType).toBe('City')
    expect(input.locationName).toBe('Ulaanbaatar - Khan-Uul')
    expect(input.pickupAddress).toBe('Khan-Uul District, Ulaanbaatar, Mongolia')
    expect(input.pickupInstructions).toBe('Call on arrival')
    expect(input.mileagePolicy).toBe('300 km/day')
  })

  it('does not include server-owned fields', () => {
    const input = draftToCarInput(filled())
    expect('id' in input).toBe(false)
    expect('ownerId' in input).toBe(false)
    expect('available' in input).toBe(false)
    expect('createdAt' in input).toBe(false)
  })
})
