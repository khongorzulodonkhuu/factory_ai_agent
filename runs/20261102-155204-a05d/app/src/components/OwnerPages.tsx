import { useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState, Booking, BookingStatus, Car } from '../types';
import { ownerStats } from '../lib/store';
import { formatDateTime, locationTypeLabel } from '../lib/labels';
import { useT, useMoney } from '../i18n';
import { StatusBadge } from '../status';
import { Icon } from '../icons';

const SESSION_START = Date.now();

type StatusFilter = 'All' | BookingStatus;
const STATUS_OPTIONS: StatusFilter[] = ['All', 'Pending', 'Confirmed', 'Cancelled', 'Completed'];

function statusFilterLabel(t: (k: string, v?: Record<string, string | number>) => string, s: StatusFilter): string {
  switch (s) {
    case 'All':
      return t('All');
    case 'Pending':
      return t('Pending');
    case 'Confirmed':
      return t('Confirmed');
    case 'Cancelled':
      return t('Cancelled');
    case 'Completed':
      return t('Completed');
  }
}

function CarThumb({ car, className }: { car?: Car; className: string }) {
  const [failed, setFailed] = useState(false);
  const name = car ? `${car.make} ${car.model}` : '';
  if (!car || failed || !car.imageUrl) {
    return (
      <div className={`${className} grid place-items-center bg-background p-2 text-center text-xs font-semibold text-text-muted`}>
        {name}
      </div>
    );
  }
  return <img src={car.imageUrl} alt={name} onError={() => setFailed(true)} className={`${className} object-cover`} />;
}

function isNew(b: Booking): boolean {
  const ts = Date.parse(b.createdAt);
  return !Number.isNaN(ts) && ts >= SESSION_START;
}

function StatCard({ label, value, testId, icon }: { label: string; value: ReactNode; testId: string; icon: 'info' | 'check' | 'transmission' | 'star' }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-sm font-medium text-text-muted">{label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p data-testid={testId} className="mt-2 text-2xl font-bold tabular-nums text-text">
        {value}
      </p>
    </div>
  );
}

const btnBase =
  'inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold whitespace-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50';

export function OwnerDashboard(props: { state: AppState; ownerId: string; onSetStatus: (bookingId: string, status: BookingStatus) => void }) {
  const { state, ownerId, onSetStatus } = props;
  const t = useT();
  const money = useMoney();
  const mn = money(1).includes('₮');
  const [filter, setFilter] = useState<StatusFilter>('All');
  const stats = ownerStats(state, ownerId);

  const carById = new Map(state.cars.map((c) => [c.id, c]));
  const userById = new Map(state.users.map((u) => [u.id, u]));
  const mine = state.bookings
    .filter((b) => {
      const car = carById.get(b.carId);
      return car ? car.ownerId === ownerId : b.ownerId === ownerId;
    })
    .slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const counts: Record<StatusFilter, number> = {
    All: mine.length,
    Pending: 0,
    Confirmed: 0,
    Cancelled: 0,
    Completed: 0,
  };
  mine.forEach((b) => {
    counts[b.status] = (counts[b.status] ?? 0) + 1;
  });
  const completedCount = counts.Completed;
  const visible = filter === 'All' ? mine : mine.filter((b) => b.status === filter);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text">{t('Your fleet today')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('Requests, active rentals and earnings at a glance.')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('Pending requests')} value={stats.pending} testId="stat-pending" icon="info" />
        <StatCard label={t('Active rentals')} value={stats.active} testId="stat-active" icon="check" />
        <StatCard label={t('Cars listed')} value={stats.carsListed} testId="stat-cars" icon="transmission" />
        <StatCard label={t('Earnings')} value={money(stats.earnings)} testId="stat-earnings" icon="star" />
      </div>
      <p className="mt-2 text-xs text-text-muted">{t('Earnings are the totals of {count} completed rentals.', { count: completedCount })}</p>

      <section className="mt-8 rounded-card border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text">{t('Booking requests')}</h2>
            <p className="text-sm text-text-muted">{t('Approve or decline requests for your cars.')}</p>
          </div>
          <div className="w-full sm:w-56">
            <label htmlFor="status-filter" className="mb-1.5 block text-sm font-medium text-text">
              {t('Status')}
            </label>
            <div className="relative">
              <select
                id="status-filter"
                data-testid="status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as StatusFilter)}
                className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface px-3.5 pr-10 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {`${statusFilterLabel(t, s)} (${counts[s]})`}
                  </option>
                ))}
              </select>
              <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon name="calendar" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm text-text-muted">{t('No booking requests here yet.')}</p>
            {filter !== 'All' && (
              <button type="button" onClick={() => setFilter('All')} className={`${btnBase} mt-4 border border-border bg-surface text-text hover:bg-background`}>
                {t('Show all requests')}
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {visible.map((b) => {
              const car = carById.get(b.carId);
              const renter = userById.get(b.renterId);
              const carName = car ? `${car.make} ${car.model} ${car.year}` : t('Removed car');
              return (
                <li key={b.id} data-testid="request-row" className="flex flex-col gap-4 rounded-lg border border-border p-4 md:flex-row md:items-center">
                  <CarThumb car={car} className="h-20 w-full shrink-0 rounded-lg md:w-32" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text">{carName}</p>
                      <StatusBadge status={b.status} />
                      {isNew(b) && <span className="rounded-full bg-accent/15 px-2 text-xs font-semibold text-accent">{t('New')}</span>}
                    </div>
                    {renter && <p className="mt-1 text-sm text-text">{t('Renter: {name}', { name: renter.name })}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-text-muted">
                      <Icon name="calendar" className="h-4 w-4" />
                      <span>{`${formatDateTime(b.pickupDate, b.pickupTime, mn)} → ${formatDateTime(b.returnDate, b.returnTime, mn)}`}</span>
                    </p>
                    <p className="mt-1 text-sm text-text-muted tabular-nums">{t('{count} days', { count: Number(b.days) || 0 })}</p>
                  </div>
                  <div className="flex flex-col gap-3 md:items-end">
                    <p className="text-lg font-bold tabular-nums text-text">{money(Number(b.total) || 0)}</p>
                    <div className="flex flex-wrap gap-2">
                      {b.status === 'Pending' && (
                        <>
                          <button type="button" data-testid="approve-btn" onClick={() => onSetStatus(b.id, 'Confirmed')} className={`${btnBase} bg-primary text-white hover:bg-primary-dark`}>
                            {t('Approve')}
                          </button>
                          <button type="button" data-testid="decline-btn" onClick={() => onSetStatus(b.id, 'Cancelled')} className={`${btnBase} border border-border bg-surface text-danger hover:bg-background`}>
                            {t('Decline')}
                          </button>
                        </>
                      )}
                      {b.status === 'Confirmed' && (
                        <>
                          <button type="button" data-testid="complete-btn" onClick={() => onSetStatus(b.id, 'Completed')} className={`${btnBase} bg-primary text-white hover:bg-primary-dark`}>
                            {t('Mark completed')}
                          </button>
                          <button type="button" data-testid="cancel-btn" onClick={() => onSetStatus(b.id, 'Cancelled')} className={`${btnBase} border border-border bg-surface text-danger hover:bg-background`}>
                            {t('Cancel')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export function MyFleet(props: {
  state: AppState;
  ownerId: string;
  onAdd: () => void;
  onEdit: (carId: string) => void;
  onToggleAvailability: (carId: string, available: boolean) => void;
  onDelete: (carId: string) => void;
}) {
  const { state, ownerId, onAdd, onEdit, onToggleAvailability, onDelete } = props;
  const t = useT();
  const money = useMoney();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const cars = state.cars
    .filter((c) => c.ownerId === ownerId)
    .slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-text">{t('My fleet')}</h1>
          <p className="mt-1 text-sm text-text-muted">{t('{count} cars listed', { count: cars.length })}</p>
        </div>
        <button type="button" data-testid="add-car-btn" onClick={onAdd} className={`${btnBase} bg-primary text-white hover:bg-primary-dark`}>
          {t('+ List a car')}
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center shadow-sm">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon name="info" className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm text-text-muted">{t('You have not listed any cars yet.')}</p>
          <button type="button" onClick={onAdd} className={`${btnBase} mt-4 bg-primary text-white hover:bg-primary-dark`}>
            {t('+ List a car')}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {cars.map((car) => {
            const location = [locationTypeLabel(t, car.locationType), car.locationName ? t(car.locationName) : ''].filter(Boolean).join(' · ');
            return (
              <li key={car.id} data-testid="fleet-row" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md md:flex-row md:items-center">
                <div className="relative shrink-0">
                  <CarThumb car={car} className="aspect-[16/10] w-full rounded-lg md:w-40" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text">{`${car.make} ${car.model} ${car.year}`}</p>
                    <StatusBadge status={car.available ? 'Available' : 'Unavailable'} />
                  </div>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-text">{t('{amount}/day', { amount: money(Number(car.dailyRate) || 0) })}</p>
                  {location && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-text-muted">
                      <Icon name="location" className="h-4 w-4 shrink-0" />
                      <span className="min-w-0">{location}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {confirmId === car.id ? (
                    <>
                      <span className="self-center text-sm text-text">{t('Delete this car?')}</span>
                      <button
                        type="button"
                        data-testid="confirm-delete-btn"
                        onClick={() => {
                          setConfirmId(null);
                          onDelete(car.id);
                        }}
                        className={`${btnBase} bg-danger text-white hover:opacity-90`}
                      >
                        {t('Delete')}
                      </button>
                      <button type="button" onClick={() => setConfirmId(null)} className={`${btnBase} border border-border bg-surface text-text hover:bg-background`}>
                        {t('Cancel')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" data-testid="fleet-edit-btn" onClick={() => onEdit(car.id)} className={`${btnBase} border border-border bg-surface text-text hover:bg-background`}>
                        {t('Edit')}
                      </button>
                      <button
                        type="button"
                        data-testid="fleet-toggle-btn"
                        aria-pressed={car.available}
                        onClick={() => onToggleAvailability(car.id, !car.available)}
                        className={`${btnBase} border border-border bg-surface text-text hover:bg-background`}
                      >
                        {car.available ? t('Mark unavailable') : t('Mark available')}
                      </button>
                      <button type="button" data-testid="fleet-delete-btn" onClick={() => setConfirmId(car.id)} className={`${btnBase} border border-border bg-surface text-danger hover:bg-background`}>
                        {t('Delete')}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
