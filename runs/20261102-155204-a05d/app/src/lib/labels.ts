import type { BodyType, CarErrorCode, FuelType, LocationType, Role, Transmission } from '../types';

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function fuelLabel(t: TFn, v: FuelType): string {
  switch (v) {
    case 'Gasoline':
      return t('Gasoline');
    case 'Diesel':
      return t('Diesel');
    case 'Hybrid':
      return t('Hybrid');
    case 'Electric':
      return t('Electric');
    default:
      return v ? t(String(v)) : '';
  }
}

export function transmissionLabel(t: TFn, v: Transmission): string {
  switch (v) {
    case 'Automatic':
      return t('Automatic');
    case 'Manual':
      return t('Manual');
    default:
      return v ? t(String(v)) : '';
  }
}

export function bodyTypeLabel(t: TFn, v: BodyType): string {
  switch (v) {
    case 'Sedan':
      return t('Sedan');
    case 'SUV':
      return t('SUV');
    case 'Hatchback':
      return t('Hatchback');
    case 'Pickup':
      return t('Pickup');
    case 'Van':
      return t('Van');
    case 'Coupe':
      return t('Coupe');
    default:
      return v ? t(String(v)) : '';
  }
}

export function locationTypeLabel(t: TFn, v: LocationType): string {
  switch (v) {
    case 'City':
      return t('City');
    case 'Airport Hub':
      return t('Airport Hub');
    case 'Specific Address':
      return t('Specific Address');
    default:
      return v ? t(String(v)) : '';
  }
}

export function roleLabel(t: TFn, v: Role): string {
  switch (v) {
    case 'owner':
      return t('Owner');
    case 'renter':
      return t('Renter');
    default:
      return v ? t(String(v)) : '';
  }
}

export function mileageLabel(t: TFn, v: string): string {
  const value = (v ?? '').trim();
  if (!value || value.toLowerCase() === 'unlimited') return t('Unlimited');
  const m = value.match(/^(\d[\d,.]*)\s*km\s*\/\s*day$/i);
  if (m) return t('{km} km/day', { km: m[1] });
  return t(value);
}

export function carErrorLabel(t: TFn, code: CarErrorCode): string {
  switch (code) {
    case 'required':
      return t('This field is required');
    case 'location-required':
      return t('Pickup/Drop-off location is required');
    case 'year-range':
      return t('Year must be a 4-digit number between 1990 and next year');
    case 'rate-positive':
      return t('Daily rate must be greater than 0');
    case 'fee-negative':
      return t('Cleaning fee must be 0 or more');
    default:
      return t('This field is required');
  }
}

export function formatDateTime(date: string, time: string, mongolian: boolean): string {
  const d = (date ?? '').trim();
  const tm = (time ?? '').trim();
  const shownDate = mongolian ? d.replace(/-/g, '.') : d;
  return [shownDate, tm].filter((p) => p.length > 0).join(' ');
}
