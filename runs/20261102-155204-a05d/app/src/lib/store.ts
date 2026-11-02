import type {
  AppState,
  Booking,
  BookingStatus,
  Car,
  CarInput,
  NewBookingParams,
  OwnerStats,
  SavedEntry,
  User,
} from '../types';
import { calcTotal, isValidRange, rentalDays } from './pricing';
import seed from '../data/seed.json';

export const STORAGE_KEY = 'wheels2go-state';
export const SESSION_KEY = 'wheels2go-user';

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeCar(raw: unknown): Car | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== 'string') return null;
  return {
    id: c.id,
    ownerId: str(c.ownerId),
    make: str(c.make),
    model: str(c.model),
    year: num(c.year, new Date().getFullYear()),
    bodyType: (str(c.bodyType, 'Sedan') || 'Sedan') as Car['bodyType'],
    fuelType: (str(c.fuelType, 'Gasoline') || 'Gasoline') as Car['fuelType'],
    transmission: (str(c.transmission, 'Automatic') || 'Automatic') as Car['transmission'],
    seats: num(c.seats, 5),
    bags: num(c.bags, 2),
    odometerKm: num(c.odometerKm, 0),
    mileagePolicy: str(c.mileagePolicy, 'Unlimited') || 'Unlimited',
    dailyRate: num(c.dailyRate, 0),
    cleaningFee: num(c.cleaningFee, 0),
    imageUrl: str(c.imageUrl),
    locationType: (str(c.locationType, 'City') || 'City') as Car['locationType'],
    locationName: str(c.locationName),
    pickupAddress: str(c.pickupAddress),
    pickupInstructions: str(c.pickupInstructions),
    available: c.available !== false,
    createdAt: str(c.createdAt, '1970-01-01T00:00:00Z'),
  };
}

function normalizeBooking(raw: unknown): Booking | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (typeof b.id !== 'string') return null;
  const days = num(b.days, 0);
  const dailyRate = num(b.dailyRate, 0);
  const cleaningFee = num(b.cleaningFee, 0);
  return {
    id: b.id,
    carId: str(b.carId),
    renterId: str(b.renterId),
    ownerId: str(b.ownerId),
    pickupDate: str(b.pickupDate),
    pickupTime: str(b.pickupTime, '10:00') || '10:00',
    returnDate: str(b.returnDate),
    returnTime: str(b.returnTime, '10:00') || '10:00',
    days,
    dailyRate,
    cleaningFee,
    total: num(b.total, calcTotal(days, dailyRate, cleaningFee)),
    status: (str(b.status, 'Pending') || 'Pending') as BookingStatus,
    createdAt: str(b.createdAt, '1970-01-01T00:00:00Z'),
  };
}

function normalizeState(raw: unknown): AppState {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const users: User[] = Array.isArray(r.users)
    ? (r.users as unknown[]).filter((u): u is User => !!u && typeof u === 'object' && typeof (u as User).id === 'string')
    : [];
  const cars: Car[] = Array.isArray(r.cars)
    ? (r.cars as unknown[]).map(normalizeCar).filter((c): c is Car => c !== null)
    : [];
  const bookings: Booking[] = Array.isArray(r.bookings)
    ? (r.bookings as unknown[]).map(normalizeBooking).filter((b): b is Booking => b !== null)
    : [];
  const saved: SavedEntry[] = Array.isArray(r.saved)
    ? (r.saved as unknown[]).filter(
        (s): s is SavedEntry =>
          !!s && typeof s === 'object' && typeof (s as SavedEntry).userId === 'string' && typeof (s as SavedEntry).carId === 'string',
      )
    : [];
  return { users, cars, bookings, saved };
}

export function seedState(): AppState {
  return normalizeState(JSON.parse(JSON.stringify(seed)) as unknown);
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = normalizeState(JSON.parse(raw) as unknown);
      if (parsed.users.length > 0) return parsed;
    }
  } catch {
    // fall through to seed
  }
  const s = seedState();
  saveState(s);
  return s;
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function loadSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSessionUserId(id: string | null): void {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function addCar(state: AppState, ownerId: string, input: CarInput, now?: string): AppState {
  const car: Car = {
    ...input,
    id: newId('c'),
    ownerId,
    available: true,
    createdAt: now ?? new Date().toISOString(),
  };
  return { ...state, cars: [...state.cars, car] };
}

export function updateCar(state: AppState, carId: string, input: CarInput): AppState {
  return {
    ...state,
    cars: state.cars.map((c) => (c.id === carId ? { ...c, ...input, id: c.id, ownerId: c.ownerId, createdAt: c.createdAt, available: c.available } : c)),
  };
}

export function deleteCar(state: AppState, carId: string): AppState {
  return {
    ...state,
    cars: state.cars.filter((c) => c.id !== carId),
    saved: state.saved.filter((s) => s.carId !== carId),
  };
}

export function setCarAvailability(state: AppState, carId: string, available: boolean): AppState {
  return {
    ...state,
    cars: state.cars.map((c) => (c.id === carId ? { ...c, available } : c)),
  };
}

export function addBooking(
  state: AppState,
  params: NewBookingParams,
  now?: string,
): { state: AppState; booking: Booking | null } {
  const car = state.cars.find((c) => c.id === params.carId);
  if (!car || !isValidRange(params.pickupDate, params.returnDate)) {
    return { state, booking: null };
  }
  const days = rentalDays(params.pickupDate, params.returnDate);
  if (!(days > 0)) return { state, booking: null };
  const booking: Booking = {
    id: newId('b'),
    carId: car.id,
    renterId: params.renterId,
    ownerId: car.ownerId,
    pickupDate: params.pickupDate,
    pickupTime: params.pickupTime || '10:00',
    returnDate: params.returnDate,
    returnTime: params.returnTime || '10:00',
    days,
    dailyRate: car.dailyRate,
    cleaningFee: car.cleaningFee,
    total: calcTotal(days, car.dailyRate, car.cleaningFee),
    status: 'Pending',
    createdAt: now ?? new Date().toISOString(),
  };
  return { state: { ...state, bookings: [...state.bookings, booking] }, booking };
}

export function setBookingStatus(state: AppState, bookingId: string, status: BookingStatus): AppState {
  return {
    ...state,
    bookings: state.bookings.map((b) => (b.id === bookingId ? { ...b, status } : b)),
  };
}

export function isSaved(state: AppState, userId: string, carId: string): boolean {
  return state.saved.some((s) => s.userId === userId && s.carId === carId);
}

export function toggleSaved(state: AppState, userId: string, carId: string): AppState {
  if (isSaved(state, userId, carId)) {
    return { ...state, saved: state.saved.filter((s) => !(s.userId === userId && s.carId === carId)) };
  }
  return { ...state, saved: [...state.saved, { userId, carId }] };
}

function bookingOwner(state: AppState, b: Booking): string {
  const car = state.cars.find((c) => c.id === b.carId);
  return car ? car.ownerId : b.ownerId;
}

export function ownerStats(state: AppState, ownerId: string): OwnerStats {
  const mine = state.bookings.filter((b) => bookingOwner(state, b) === ownerId);
  return {
    pending: mine.filter((b) => b.status === 'Pending').length,
    active: mine.filter((b) => b.status === 'Confirmed').length,
    carsListed: state.cars.filter((c) => c.ownerId === ownerId).length,
    earnings: mine
      .filter((b) => b.status === 'Completed')
      .reduce((sum, b) => sum + (Number.isFinite(b.total) ? b.total : 0), 0),
  };
}
