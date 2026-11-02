import { useMemo, useState } from 'react';
import type { AppState, Booking, BookingStatus, Car } from '../types';
import { useT, useMoney } from '../i18n';
import { StatusBadge } from '../status';
import { Icon } from '../icons';
import { formatDateTime } from '../lib/labels';
import CarCard from './CarCard';

const SESSION_START = Date.now();

function isNew(b: Booking): boolean {
  const ts = Date.parse(b.createdAt);
  return Number.isFinite(ts) && ts >= SESSION_START - 1000;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function CarThumb({ car }: { car?: Car }) {
  const [failed, setFailed] = useState(false);
  const name = car ? `${car.make} ${car.model}` : '';
  if (!car || !car.imageUrl || failed) {
    return (
      <div className="grid aspect-[16/10] w-full place-items-center rounded-lg bg-background p-2 text-center text-sm font-semibold text-text-muted sm:w-48">
        {name}
      </div>
    );
  }
  return (
    <img
      src={car.imageUrl}
      alt={name}
      onError={() => setFailed(true)}
      className="aspect-[16/10] w-full rounded-lg object-cover sm:w-48"
    />
  );
}

type Tab = 'All' | BookingStatus;
const TABS: Tab[] = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

export function MyBookings(props: { state: AppState; userId: string; onCancel: (bookingId: string) => void; onBrowse: () => void }) {
  const { state, userId, onCancel, onBrowse } = props;
  const t = useT();
  const money = useMoney();
  const mn = money(1).includes('₮');
  const [tab, setTab] = useState<Tab>('All');

  const mine = useMemo(
    () =>
      state.bookings
        .filter((b) => b.renterId === userId)
        .slice()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [state.bookings, userId],
  );

  const tabLabel = (s: Tab) => {
    switch (s) {
      case 'All':
        return t('All');
      case 'Pending':
        return t('Pending');
      case 'Confirmed':
        return t('Confirmed');
      case 'Completed':
        return t('Completed');
      case 'Cancelled':
        return t('Cancelled');
    }
  };

  const visible = tab === 'All' ? mine : mine.filter((b) => b.status === tab);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text">{t('My bookings')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('Track your booking requests and upcoming trips.')}</p>
      </div>

      {mine.length === 0 ? (
        <div data-testid="bookings-empty" className="rounded-card border border-border bg-surface p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon name="calendar" className="h-7 w-7" />
          </div>
          <p className="text-lg font-semibold text-text">{t('No bookings yet')}</p>
          <p className="mt-1 text-sm text-text-muted">{t('Browse cars and send your first booking request.')}</p>
          <button
            type="button"
            onClick={onBrowse}
            className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {t('Find a car')}
          </button>
        </div>
      ) : (
        <>
          <div role="tablist" className="mb-5 flex flex-wrap gap-2">
            {TABS.map((s) => {
              const count = s === 'All' ? mine.length : mine.filter((b) => b.status === s).length;
              const active = tab === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(s)}
                  className={`min-h-10 whitespace-normal rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    active ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text hover:border-primary'
                  }`}
                >
                  {tabLabel(s)} <span className="tabular-nums opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-card border border-border bg-surface p-8 text-center text-sm text-text-muted">
              {t('No bookings with this status.')}
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((b) => {
                const car = state.cars.find((c) => c.id === b.carId);
                const carName = car ? `${car.make} ${car.model} ${car.year}` : t('Car no longer listed');
                const days = num(b.days);
                return (
                  <li
                    key={b.id}
                    data-testid="booking-row"
                    className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row"
                  >
                    <div className="shrink-0">
                      <CarThumb car={car} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-text">{carName}</h2>
                        <StatusBadge status={b.status} />
                        {isNew(b) && (
                          <span className="rounded-full bg-accent/15 px-2 text-xs font-semibold text-accent">{t('New')}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="calendar" className="h-4 w-4 text-text-muted" />
                          {t('Pickup')}: {formatDateTime(b.pickupDate, b.pickupTime, mn)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="calendar" className="h-4 w-4 text-text-muted" />
                          {t('Return')}: {formatDateTime(b.returnDate, b.returnTime, mn)}
                        </span>
                      </div>
                      {car && car.pickupAddress && (
                        <p className="flex items-start gap-1.5 text-sm text-text">
                          <Icon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                          <span className="min-w-0 break-words">{t(car.pickupAddress)}</span>
                        </p>
                      )}
                      {car && car.pickupInstructions && (
                        <p className="flex items-start gap-1.5 text-sm text-text-muted">
                          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="min-w-0 break-words">{t(car.pickupInstructions)}</span>
                        </p>
                      )}
                      <dl className="grid grid-cols-2 gap-2 pt-1 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs text-text-muted">{t('Days')}</dt>
                          <dd className="tabular-nums font-medium text-text">{days}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-muted">{t('Daily rate')}</dt>
                          <dd className="tabular-nums font-medium text-text">{money(num(b.dailyRate))}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-text-muted">{t('Cleaning fee')}</dt>
                          <dd className="tabular-nums font-medium text-text">{money(num(b.cleaningFee))}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-row items-end justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <div className="text-xs text-text-muted">{t('Total')}</div>
                        <div className="text-2xl font-bold tabular-nums text-text whitespace-nowrap">{money(num(b.total))}</div>
                      </div>
                      {b.status === 'Pending' && (
                        <button
                          type="button"
                          data-testid="cancel-booking-btn"
                          onClick={() => onCancel(b.id)}
                          className="min-h-10 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-danger hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          {t('Cancel booking')}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function SavedCars(props: { state: AppState; userId: string; onOpenCar: (carId: string) => void; onToggleSave: (carId: string) => void; onBrowse: () => void }) {
  const { state, userId, onOpenCar, onToggleSave, onBrowse } = props;
  const t = useT();

  const cars = useMemo(() => {
    const ids = state.saved.filter((s) => s.userId === userId).map((s) => s.carId);
    return ids
      .map((id) => state.cars.find((c) => c.id === id))
      .filter((c): c is Car => !!c);
  }, [state.saved, state.cars, userId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text">{t('Saved cars')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('Cars you have saved with the heart button.')}</p>
      </div>

      {cars.length === 0 ? (
        <div data-testid="saved-empty" className="rounded-card border border-border bg-surface p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-danger/10 text-danger">
            <Icon name="heart" className="h-7 w-7" />
          </div>
          <p className="text-lg font-semibold text-text">{t('No saved cars yet')}</p>
          <p className="mt-1 text-sm text-text-muted">{t('Tap the heart on any car to save it here.')}</p>
          <button
            type="button"
            onClick={onBrowse}
            className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {t('Browse cars')}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              owner={state.users.find((u) => u.id === car.ownerId)}
              saved={true}
              onOpen={onOpenCar}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
