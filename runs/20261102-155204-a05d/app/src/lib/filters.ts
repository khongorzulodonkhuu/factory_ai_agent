import type { Car, Filters, SortOption, User } from '../types';

export const PAGE_SIZE = 6;

export function defaultFilters(): Filters {
  return {
    make: '',
    location: '',
    maxRate: null,
    transmission: 'All',
    bodyType: 'All',
    fuelType: 'All',
  };
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function time(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function filterCars(cars: Car[], filters: Filters): Car[] {
  const make = (filters.make ?? '').trim().toLowerCase();
  const keyword = (filters.location ?? '').trim().toLowerCase();
  const maxRate =
    filters.maxRate === null || filters.maxRate === undefined || !Number.isFinite(filters.maxRate)
      ? null
      : filters.maxRate;

  return cars.filter((car) => {
    if (!car.available) return false;
    if (make && make !== 'all' && (car.make ?? '').trim().toLowerCase() !== make) return false;
    if (keyword) {
      const hay = `${car.locationName ?? ''} ${car.pickupAddress ?? ''}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    if (maxRate !== null && num(car.dailyRate) > maxRate) return false;
    if (filters.transmission !== 'All' && car.transmission !== filters.transmission) return false;
    if (filters.bodyType !== 'All' && car.bodyType !== filters.bodyType) return false;
    if (filters.fuelType !== 'All' && car.fuelType !== filters.fuelType) return false;
    return true;
  });
}

function newestCompare(a: Car, b: Car): number {
  const d = time(b.createdAt) - time(a.createdAt);
  if (d !== 0) return d;
  return (b.id ?? '').localeCompare(a.id ?? '', undefined, { numeric: true });
}

export function sortCars(cars: Car[], sort: SortOption): Car[] {
  const list = [...cars];
  if (sort === 'price-asc') {
    list.sort((a, b) => num(a.dailyRate) - num(b.dailyRate) || newestCompare(a, b));
  } else if (sort === 'price-desc') {
    list.sort((a, b) => num(b.dailyRate) - num(a.dailyRate) || newestCompare(a, b));
  } else {
    list.sort(newestCompare);
  }
  return list;
}

export function paginate<T>(items: T[], page: number, perPage: number = PAGE_SIZE): T[] {
  const size = Number.isFinite(perPage) && perPage > 0 ? Math.floor(perPage) : PAGE_SIZE;
  if (!Number.isFinite(page) || page < 1) return [];
  const start = (Math.floor(page) - 1) * size;
  if (start >= items.length) return [];
  return items.slice(start, start + size);
}

export function pageCount(total: number, perPage: number = PAGE_SIZE): number {
  const size = Number.isFinite(perPage) && perPage > 0 ? Math.floor(perPage) : PAGE_SIZE;
  const t = Number.isFinite(total) && total > 0 ? total : 0;
  return Math.max(1, Math.ceil(t / size));
}

export function distinctMakes(cars: Car[]): string[] {
  const set = new Set<string>();
  for (const car of cars) {
    const m = (car.make ?? '').trim();
    if (m) set.add(m);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function ownerOf(users: User[], ownerId: string): User | undefined {
  return users.find((u) => u.id === ownerId);
}

export function topPicks(cars: Car[], users: User[], n: number = 4): Car[] {
  const count = Number.isFinite(n) && n > 0 ? Math.floor(n) : 4;
  const ratingOf = (car: Car): number => {
    const owner = ownerOf(users, car.ownerId);
    return num(owner?.rating, 0);
  };
  return cars
    .filter((c) => c.available)
    .map((car) => ({ car, rating: ratingOf(car) }))
    .sort((a, b) => b.rating - a.rating || newestCompare(a.car, b.car))
    .slice(0, count)
    .map((x) => x.car);
}
