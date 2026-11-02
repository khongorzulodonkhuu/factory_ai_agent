import type { Car, CarDraft, CarErrors, CarInput, FuelType, Transmission, BodyType, LocationType } from '../types';

const FUELS: FuelType[] = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS: Transmission[] = ['Automatic', 'Manual'];
const BODIES: BodyType[] = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Coupe'];
const LOCATION_TYPES: LocationType[] = ['City', 'Airport Hub', 'Specific Address'];

function toNum(value: string): number {
  const s = (value ?? '').toString().trim().replace(/,/g, '');
  if (s === '') return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function intOr(value: string, fallback: number, min = 0): number {
  const n = toNum(value);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.round(n);
}

function numOr(value: string, fallback: number): number {
  const n = toNum(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

export function emptyDraft(): CarDraft {
  return {
    make: '',
    model: '',
    year: '',
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    seats: '5',
    bags: '2',
    odometerKm: '0',
    mileagePolicy: 'Unlimited',
    dailyRate: '',
    cleaningFee: '0',
    imageUrl: '',
    locationType: 'City',
    locationName: '',
    pickupAddress: '',
    pickupInstructions: '',
  };
}

export function carToDraft(car: Car): CarDraft {
  return {
    make: str(car.make),
    model: str(car.model),
    year: Number.isFinite(car.year) ? String(car.year) : '',
    fuelType: FUELS.includes(car.fuelType) ? car.fuelType : '',
    transmission: TRANSMISSIONS.includes(car.transmission) ? car.transmission : '',
    bodyType: BODIES.includes(car.bodyType) ? car.bodyType : 'Sedan',
    seats: String(Number.isFinite(car.seats) ? car.seats : 5),
    bags: String(Number.isFinite(car.bags) ? car.bags : 2),
    odometerKm: String(Number.isFinite(car.odometerKm) ? car.odometerKm : 0),
    mileagePolicy: str(car.mileagePolicy) || 'Unlimited',
    dailyRate: Number.isFinite(car.dailyRate) ? String(car.dailyRate) : '',
    cleaningFee: String(Number.isFinite(car.cleaningFee) ? car.cleaningFee : 0),
    imageUrl: str(car.imageUrl),
    locationType: LOCATION_TYPES.includes(car.locationType) ? car.locationType : '',
    locationName: str(car.locationName),
    pickupAddress: str(car.pickupAddress),
    pickupInstructions: str(car.pickupInstructions),
  };
}

export function validateCarDraft(draft: CarDraft, currentYear?: number): CarErrors {
  const errors: CarErrors = {};
  const thisYear = currentYear ?? new Date().getFullYear();

  if (!str(draft.make).trim()) errors.make = 'required';
  if (!str(draft.model).trim()) errors.model = 'required';

  const yearStr = str(draft.year).trim();
  if (!yearStr) {
    errors.year = 'required';
  } else if (!/^\d{4}$/.test(yearStr)) {
    errors.year = 'year-range';
  } else {
    const y = Number(yearStr);
    if (y < 1990 || y > thisYear + 1) errors.year = 'year-range';
  }

  if (!draft.fuelType || !FUELS.includes(draft.fuelType)) errors.fuelType = 'required';
  if (!draft.transmission || !TRANSMISSIONS.includes(draft.transmission)) errors.transmission = 'required';

  const rateStr = str(draft.dailyRate).trim();
  if (!rateStr) {
    errors.dailyRate = 'required';
  } else {
    const r = toNum(rateStr);
    if (!Number.isFinite(r) || r <= 0) errors.dailyRate = 'rate-positive';
  }

  const feeStr = str(draft.cleaningFee).trim();
  if (feeStr) {
    const f = toNum(feeStr);
    if (!Number.isFinite(f) || f < 0) errors.cleaningFee = 'fee-negative';
  }

  if (!str(draft.imageUrl).trim()) errors.imageUrl = 'required';

  if (!draft.locationType || !LOCATION_TYPES.includes(draft.locationType)) {
    errors.locationType = 'location-required';
  }
  if (!str(draft.locationName).trim()) {
    errors.locationName = 'location-required';
  }

  return errors;
}

export function draftToCarInput(draft: CarDraft): CarInput {
  const locationName = str(draft.locationName).trim();
  const address = str(draft.pickupAddress).trim();
  const fee = numOr(draft.cleaningFee, 0);
  const rate = numOr(draft.dailyRate, 0);
  return {
    make: str(draft.make).trim(),
    model: str(draft.model).trim(),
    year: intOr(draft.year, new Date().getFullYear(), 0),
    bodyType: BODIES.includes(draft.bodyType) ? draft.bodyType : 'Sedan',
    fuelType: draft.fuelType && FUELS.includes(draft.fuelType) ? draft.fuelType : 'Gasoline',
    transmission: draft.transmission && TRANSMISSIONS.includes(draft.transmission) ? draft.transmission : 'Automatic',
    seats: intOr(draft.seats, 5, 1),
    bags: intOr(draft.bags, 2, 0),
    odometerKm: intOr(draft.odometerKm, 0, 0),
    mileagePolicy: str(draft.mileagePolicy).trim() || 'Unlimited',
    dailyRate: rate > 0 ? Math.round(rate * 100) / 100 : 0,
    cleaningFee: fee >= 0 ? Math.round(fee * 100) / 100 : 0,
    imageUrl: str(draft.imageUrl).trim(),
    locationType: draft.locationType && LOCATION_TYPES.includes(draft.locationType) ? draft.locationType : 'City',
    locationName,
    pickupAddress: address || locationName,
    pickupInstructions: str(draft.pickupInstructions).trim(),
  };
}
