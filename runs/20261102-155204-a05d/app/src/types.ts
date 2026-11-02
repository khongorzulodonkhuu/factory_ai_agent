export type Role = 'owner' | 'renter';

export type FuelType = 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric';

export type Transmission = 'Automatic' | 'Manual';

export type BodyType = 'Sedan' | 'SUV' | 'Hatchback' | 'Pickup' | 'Van' | 'Coupe';

export type LocationType = 'City' | 'Airport Hub' | 'Specific Address';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';

export interface User {
  id: string;
  role: Role;
  name: string;
  rating?: number;
  reviewCount?: number;
}

export interface Car {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  bodyType: BodyType;
  fuelType: FuelType;
  transmission: Transmission;
  seats: number;
  bags: number;
  odometerKm: number;
  mileagePolicy: string;
  dailyRate: number;
  cleaningFee: number;
  imageUrl: string;
  locationType: LocationType;
  locationName: string;
  pickupAddress: string;
  pickupInstructions: string;
  available: boolean;
  createdAt: string;
}

export type CarInput = Omit<Car, 'id' | 'ownerId' | 'createdAt' | 'available'>;

export interface Booking {
  id: string;
  carId: string;
  renterId: string;
  ownerId: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  days: number;
  dailyRate: number;
  cleaningFee: number;
  total: number;
  status: BookingStatus;
  createdAt: string;
}

export interface SavedEntry {
  userId: string;
  carId: string;
}

export interface AppState {
  users: User[];
  cars: Car[];
  bookings: Booking[];
  saved: SavedEntry[];
}

export interface Filters {
  make: string;
  location: string;
  maxRate: number | null;
  transmission: 'All' | Transmission;
  bodyType: 'All' | BodyType;
  fuelType: 'All' | FuelType;
}

export type SortOption = 'newest' | 'price-asc' | 'price-desc';

export interface CarDraft {
  make: string;
  model: string;
  year: string;
  fuelType: FuelType | '';
  transmission: Transmission | '';
  bodyType: BodyType;
  seats: string;
  bags: string;
  odometerKm: string;
  mileagePolicy: string;
  dailyRate: string;
  cleaningFee: string;
  imageUrl: string;
  locationType: LocationType | '';
  locationName: string;
  pickupAddress: string;
  pickupInstructions: string;
}

export type CarErrorCode = 'required' | 'location-required' | 'year-range' | 'rate-positive' | 'fee-negative';

export type CarErrors = Partial<Record<keyof CarDraft, CarErrorCode>>;

export interface PriceBreakdown {
  days: number;
  dailyRate: number;
  cleaningFee: number;
  total: number;
}

export interface OwnerStats {
  pending: number;
  active: number;
  carsListed: number;
  earnings: number;
}

export interface NewBookingParams {
  carId: string;
  renterId: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
}

export type View = 'home' | 'details' | 'bookings' | 'saved' | 'dashboard' | 'fleet';
