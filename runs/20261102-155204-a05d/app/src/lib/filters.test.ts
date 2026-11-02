import { describe, it, expect } from 'vitest'
import { defaultFilters, filterCars, sortCars, paginate, pageCount, distinctMakes, topPicks, PAGE_SIZE } from './filters'
import type { Car, User, Filters } from '../types'

const base = { seats: 5, bags: 2, odometerKm: 0, mileagePolicy: 'Unlimited', cleaningFee: 0, imageUrl: 'https://example.com/car.jpg', locationType: 'City', pickupInstructions: '', available: true }

function car(o: Partial<Car> & Pick<Car, 'id' | 'ownerId' | 'make' | 'model' | 'year' | 'bodyType' | 'fuelType' | 'transmission' | 'dailyRate' | 'locationName' | 'pickupAddress' | 'createdAt'>): Car {
  return { ...base, ...o } as Car
}

const seed: Car[] = [
  car({ id: 'c1', ownerId: 'o1', make: 'Toyota', model: 'Prius', year: 2021, bodyType: 'Hatchback', fuelType: 'Hybrid', transmission: 'Automatic', dailyRate: 45, locationName: 'Ulaanbaatar city centre', pickupAddress: 'Peace Avenue 17, Sukhbaatar District, Ulaanbaatar, Mongolia', createdAt: '2025-05-01T09:00:00Z' }),
  car({ id: 'c2', ownerId: 'o1', make: 'Toyota', model: 'Land Cruiser 200', year: 2019, bodyType: 'SUV', fuelType: 'Diesel', transmission: 'Automatic', dailyRate: 120, locationName: 'Chinggis Khaan International Airport', pickupAddress: 'Chinggis Khaan International Airport, Arrivals Parking P1, Sergelen, Tuv Province, Mongolia', createdAt: '2025-05-03T09:00:00Z' }),
  car({ id: 'c3', ownerId: 'o1', make: 'Tesla', model: 'Model 3', year: 2023, bodyType: 'Sedan', fuelType: 'Electric', transmission: 'Automatic', dailyRate: 85, locationName: 'San Francisco - Mission District', pickupAddress: '2150 Mission St, San Francisco, CA 94110, USA', createdAt: '2025-05-05T09:00:00Z' }),
  car({ id: 'c4', ownerId: 'o1', make: 'Ford', model: 'Ranger', year: 2020, bodyType: 'Pickup', fuelType: 'Diesel', transmission: 'Manual', dailyRate: 70, locationName: 'Ulaanbaatar - Zaisan', pickupAddress: 'Zaisan Street 12, Khan-Uul District, Ulaanbaatar, Mongolia', createdAt: '2025-05-07T09:00:00Z' }),
  car({ id: 'c5', ownerId: 'o1', make: 'Hyundai', model: 'Staria', year: 2022, bodyType: 'Van', fuelType: 'Gasoline', transmission: 'Automatic', dailyRate: 95, locationName: 'Seoul Incheon International Airport', pickupAddress: 'Incheon Airport Terminal 1, Short-term Parking B, Incheon, South Korea', createdAt: '2025-05-09T09:00:00Z' }),
  car({ id: 'c6', ownerId: 'o1', make: 'BMW', model: 'M2', year: 2021, bodyType: 'Coupe', fuelType: 'Gasoline', transmission: 'Manual', dailyRate: 150, locationName: 'Berlin - Mitte', pickupAddress: 'Friedrichstrasse 95, 10117 Berlin, Germany', createdAt: '2025-05-11T09:00:00Z' }),
  car({ id: 'c7', ownerId: 'o2', make: 'Honda', model: 'Civic', year: 2018, bodyType: 'Sedan', fuelType: 'Gasoline', transmission: 'Manual', dailyRate: 38, locationName: 'London Heathrow Airport', pickupAddress: 'Heathrow Terminal 5, Short Stay Car Park, Level 4, Longford TW6 2GA, UK', createdAt: '2025-05-13T09:00:00Z' }),
  car({ id: 'c8', ownerId: 'o2', make: 'Hyundai', model: 'Kona Electric', year: 2022, bodyType: 'SUV', fuelType: 'Electric', transmission: 'Automatic', dailyRate: 60, locationName: 'Ulaanbaatar - Sukhbaatar Square', pickupAddress: 'Sukhbaatar Square 1, Chingeltei District, Ulaanbaatar, Mongolia', createdAt: '2025-05-15T09:00:00Z' })
]

const users: User[] = [
  { id: 'o1', role: 'owner', name: 'Bat-Erdene Ganbold', rating: 9.4, reviewCount: 38 },
  { id: 'o2', role: 'owner', name: 'Sarah Mitchell', rating: 8.7, reviewCount: 12 }
]

function filters(o: Partial<Filters>): Filters {
  return { ...defaultFilters(), ...o }
}

function ids(cars: Car[]): string[] {
  return cars.map(c => c.id)
}

describe('defaultFilters', () => {
  it('returns filters that do not restrict any car', () => {
    const f = defaultFilters()
    expect(['', 'All', 'All makes']).toContain(f.make)
    expect(f.location).toBe('')
    expect(f.maxRate).toBeNull()
    expect(f.transmission).toBe('All')
    expect(f.bodyType).toBe('All')
    expect(f.fuelType).toBe('All')
    expect(filterCars(seed, f)).toHaveLength(8)
  })
})

describe('filterCars', () => {
  it('excludes unavailable cars', () => {
    const cars = [seed[0], { ...seed[1], available: false }]
    expect(ids(filterCars(cars, defaultFilters()))).toEqual(['c1'])
  })

  it('filters by make', () => {
    expect(ids(filterCars(seed, filters({ make: 'Toyota' })))).toEqual(['c1', 'c2'])
  })

  it('matches location keyword case-insensitively on name and address', () => {
    expect(ids(filterCars(seed, filters({ location: 'ulaanbaatar' })))).toEqual(['c1', 'c4', 'c8'])
    expect(ids(filterCars(seed, filters({ location: 'ULAANBAATAR' })))).toEqual(['c1', 'c4', 'c8'])
  })

  it('keeps cars at or below the maximum daily rate', () => {
    expect(ids(filterCars(seed, filters({ maxRate: 60 })))).toEqual(['c1', 'c7', 'c8'])
  })

  it('filters by transmission', () => {
    expect(ids(filterCars(seed, filters({ transmission: 'Manual' })))).toEqual(['c4', 'c6', 'c7'])
  })

  it('filters by body type and fuel type', () => {
    expect(ids(filterCars(seed, filters({ bodyType: 'SUV' })))).toEqual(['c2', 'c8'])
    expect(ids(filterCars(seed, filters({ fuelType: 'Electric' })))).toEqual(['c3', 'c8'])
  })

  it('combines filters with AND', () => {
    const f = filters({ make: 'Hyundai', transmission: 'Automatic', maxRate: 70 })
    expect(ids(filterCars(seed, f))).toEqual(['c8'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterCars(seed, filters({ make: 'Lada' }))).toEqual([])
  })
})

describe('sortCars', () => {
  it('sorts newest first by createdAt', () => {
    expect(ids(sortCars(seed, 'newest'))).toEqual(['c8', 'c7', 'c6', 'c5', 'c4', 'c3', 'c2', 'c1'])
  })

  it('sorts by ascending daily rate', () => {
    const sorted = sortCars(seed, 'price-asc')
    expect(sorted[0].id).toBe('c7')
    expect(sorted.map(c => c.dailyRate)).toEqual([38, 45, 60, 70, 85, 95, 120, 150])
  })

  it('sorts by descending daily rate', () => {
    expect(sortCars(seed, 'price-desc').map(c => c.dailyRate)).toEqual([150, 120, 95, 85, 70, 60, 45, 38])
  })

  it('does not mutate the input array', () => {
    const before = ids(seed)
    sortCars(seed, 'price-asc')
    expect(ids(seed)).toEqual(before)
  })
})

describe('paginate', () => {
  it('uses a page size of 6', () => {
    expect(PAGE_SIZE).toBe(6)
  })

  it('returns the first 6 items on page 1 and the rest on page 2', () => {
    expect(ids(paginate(seed, 1))).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6'])
    expect(ids(paginate(seed, 2))).toEqual(['c7', 'c8'])
  })

  it('returns an empty list for a page beyond the last', () => {
    expect(paginate(seed, 3)).toEqual([])
  })
})

describe('pageCount', () => {
  it('counts pages with the default page size', () => {
    expect(pageCount(8)).toBe(2)
    expect(pageCount(6)).toBe(1)
    expect(pageCount(7)).toBe(2)
  })

  it('accepts a custom page size', () => {
    expect(pageCount(11, 5)).toBe(3)
    expect(pageCount(12, 6)).toBe(2)
  })
})

describe('distinctMakes', () => {
  it('returns each make in the fleet once', () => {
    const makes = distinctMakes(seed).slice().sort()
    expect(makes).toEqual(['BMW', 'Ford', 'Honda', 'Hyundai', 'Tesla', 'Toyota'])
  })
})

describe('topPicks', () => {
  it('returns up to 4 cars by default, ordered by owner rating', () => {
    const picks = topPicks(seed, users)
    expect(picks).toHaveLength(4)
    expect(picks.every(c => c.ownerId === 'o1')).toBe(true)
    const ratings = picks.map(c => users.find(u => u.id === c.ownerId)?.rating ?? 0)
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a))
  })

  it('respects a custom count', () => {
    expect(topPicks(seed, users, 2)).toHaveLength(2)
  })

  it('excludes unavailable cars', () => {
    const cars = seed.map(c => (c.ownerId === 'o1' ? { ...c, available: false } : c))
    const picks = topPicks(cars, users)
    expect(picks.map(c => c.id).sort()).toEqual(['c7', 'c8'])
  })
})
