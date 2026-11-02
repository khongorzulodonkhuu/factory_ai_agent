import { describe, it, expect } from 'vitest';
import { seedState, addCar, updateCar, deleteCar, setCarAvailability, addBooking, setBookingStatus, toggleSaved, isSaved, ownerStats } from './store';
import type { CarInput } from '../types';

const input: CarInput = { make: 'Mazda', model: 'CX-5', year: 2022, bodyType: 'SUV', fuelType: 'Gasoline', transmission: 'Automatic', seats: 5, bags: 3, odometerKm: 0, mileagePolicy: 'Unlimited', dailyRate: 75, cleaningFee: 20, imageUrl: 'https://example.com/car.jpg', locationType: 'City', locationName: 'Ulaanbaatar - Khan-Uul', pickupAddress: 'Khan-Uul District, Ulaanbaatar, Mongolia', pickupInstructions: '' };

describe('addCar', () => {
  it('appends an available car owned by the given owner', () => {
    const s = seedState();
    const next = addCar(s, 'o1', input, '2025-06-01T00:00:00Z');
    expect(next.cars.length).toBe(s.cars.length + 1);
    const created = next.cars[next.cars.length - 1];
    expect(created.make).toBe('Mazda');
    expect(created.ownerId).toBe('o1');
    expect(created.available).toBe(true);
    expect(created.createdAt).toBe('2025-06-01T00:00:00Z');
    expect(created.id).toBeTruthy();
  });

  it('does not mutate the previous state', () => {
    const s = seedState();
    const before = s.cars.length;
    addCar(s, 'o1', input);
    expect(s.cars.length).toBe(before);
  });
});

describe('updateCar', () => {
  it('updates the car fields and keeps id, owner and availability', () => {
    const s = seedState();
    const next = updateCar(s, 'c1', { ...input, make: 'Lexus', dailyRate: 99 });
    const car = next.cars.find((c) => c.id === 'c1');
    expect(car?.make).toBe('Lexus');
    expect(car?.dailyRate).toBe(99);
    expect(car?.ownerId).toBe('o1');
    expect(car?.available).toBe(true);
  });

  it('leaves other cars unchanged', () => {
    const s = seedState();
    const next = updateCar(s, 'c1', { ...input, make: 'Lexus' });
    const other = next.cars.find((c) => c.id === 'c2');
    expect(other?.make).toBe('Toyota');
  });
});

describe('deleteCar', () => {
  it('removes the car with the given id', () => {
    const s = seedState();
    const next = deleteCar(s, 'c2');
    expect(next.cars.some((c) => c.id === 'c2')).toBe(false);
    expect(next.cars.length).toBe(s.cars.length - 1);
  });
});

describe('setCarAvailability', () => {
  it('toggles only the targeted car to unavailable and back', () => {
    const s = seedState();
    const off = setCarAvailability(s, 'c1', false);
    expect(off.cars.find((c) => c.id === 'c1')?.available).toBe(false);
    expect(off.cars.find((c) => c.id === 'c2')?.available).toBe(true);
    const on = setCarAvailability(off, 'c1', true);
    expect(on.cars.find((c) => c.id === 'c1')?.available).toBe(true);
  });
});

describe('addBooking', () => {
  it('creates a Pending booking with the computed days and total', () => {
    const s = seedState();
    const { state, booking } = addBooking(s, { carId: 'c3', renterId: 'r1', pickupDate: '2025-07-10', pickupTime: '10:00', returnDate: '2025-07-13', returnTime: '16:30' }, '2025-06-01T00:00:00Z');
    expect(booking).not.toBeNull();
    expect(booking?.days).toBe(3);
    expect(booking?.dailyRate).toBe(85);
    expect(booking?.cleaningFee).toBe(25);
    expect(booking?.total).toBe(280);
    expect(booking?.status).toBe('Pending');
    expect(booking?.renterId).toBe('r1');
    expect(booking?.ownerId).toBe('o1');
    expect(state.bookings.length).toBe(s.bookings.length + 1);
  });

  it('returns null and adds nothing when the return date is not after pickup', () => {
    const s = seedState();
    const { state, booking } = addBooking(s, { carId: 'c3', renterId: 'r1', pickupDate: '2025-07-10', pickupTime: '10:00', returnDate: '2025-07-10', returnTime: '16:30' });
    expect(booking).toBeNull();
    expect(state.bookings.length).toBe(s.bookings.length);
  });
});

describe('setBookingStatus', () => {
  it('sets the status of only the targeted booking', () => {
    const s = seedState();
    const next = setBookingStatus(s, 'b1', 'Confirmed');
    expect(next.bookings.find((b) => b.id === 'b1')?.status).toBe('Confirmed');
    expect(next.bookings.find((b) => b.id === 'b2')?.status).toBe('Pending');
  });
});

describe('toggleSaved', () => {
  it('adds the car to saved and removes it on a second toggle', () => {
    const s = seedState();
    expect(isSaved(s, 'r1', 'c1')).toBe(false);
    const saved = toggleSaved(s, 'r1', 'c1');
    expect(isSaved(saved, 'r1', 'c1')).toBe(true);
    const unsaved = toggleSaved(saved, 'r1', 'c1');
    expect(isSaved(unsaved, 'r1', 'c1')).toBe(false);
  });
});

describe('ownerStats', () => {
  it('reports the seeded owner figures', () => {
    const stats = ownerStats(seedState(), 'o1');
    expect(stats).toEqual({ pending: 2, active: 1, carsListed: 6, earnings: 750 });
  });

  it('reports zero figures for an owner with no bookings', () => {
    const stats = ownerStats(seedState(), 'o2');
    expect(stats.pending).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.carsListed).toBe(2);
    expect(stats.earnings).toBe(0);
  });

  it('moves counts after approving a request', () => {
    const next = setBookingStatus(seedState(), 'b1', 'Confirmed');
    const stats = ownerStats(next, 'o1');
    expect(stats.pending).toBe(1);
    expect(stats.active).toBe(2);
  });

  it('adds the total of a booking to earnings when it is completed', () => {
    const next = setBookingStatus(seedState(), 'b3', 'Completed');
    const stats = ownerStats(next, 'o1');
    expect(stats.earnings).toBe(945);
    expect(stats.active).toBe(0);
  });
});
