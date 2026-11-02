import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { Car, User } from '../types';
import { useT, useMoney } from '../i18n';
import { Icon } from '../icons';
import { fuelLabel, transmissionLabel, bodyTypeLabel, mileageLabel } from '../lib/labels';

function isRecent(createdAt: string): boolean {
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}

export default function CarCard(props: {
  car: Car;
  owner?: User;
  saved: boolean;
  onOpen: (carId: string) => void;
  onToggleSave: (carId: string) => void;
  variant?: 'catalog' | 'top-pick';
}) {
  const { car, owner, saved, onOpen, onToggleSave, variant = 'catalog' } = props;
  const t = useT();
  const money = useMoney();
  const [imgFailed, setImgFailed] = useState(false);

  const name = [car.make, car.model].filter(Boolean).join(' ');
  const seats = Number.isFinite(car.seats) ? car.seats : 0;
  const bags = Number.isFinite(car.bags) ? car.bags : 0;
  const odometer = Number.isFinite(car.odometerKm) ? car.odometerKm : 0;
  const rate = Number.isFinite(car.dailyRate) ? car.dailyRate : 0;

  const description = [
    car.bodyType ? bodyTypeLabel(t, car.bodyType) : '',
    seats > 0 ? t('{count} seats', { count: seats }) : '',
    t('{km} km', { km: odometer.toLocaleString('en-US') }),
  ]
    .filter(Boolean)
    .join(' · ');

  const rating = owner && typeof owner.rating === 'number' && Number.isFinite(owner.rating) ? owner.rating : null;
  const reviews = owner && typeof owner.reviewCount === 'number' ? owner.reviewCount : 0;
  const hasRating = rating !== null && reviews > 0;

  let badge: { label: string; cls: string } | null = null;
  if (hasRating && rating !== null && rating >= 9) badge = { label: t('Top rated'), cls: 'bg-success' };
  else if (isRecent(car.createdAt)) badge = { label: t('New listing'), cls: 'bg-danger' };
  else if (car.fuelType === 'Electric') badge = { label: t('Electric'), cls: 'bg-primary' };

  const open = () => onOpen(car.id);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };
  const heart = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleSave(car.id);
  };

  return (
    <div
      data-testid={variant === 'top-pick' ? 'top-pick-card' : 'car-card'}
      role="button"
      tabIndex={0}
      aria-label={`${name} ${car.year}`}
      onClick={open}
      onKeyDown={onKey}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="relative">
        {car.imageUrl && !imgFailed ? (
          <img
            src={car.imageUrl}
            alt={name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="aspect-[16/10] w-full object-cover"
          />
        ) : (
          <div className="grid aspect-[16/10] w-full place-items-center bg-background px-4 text-center text-sm font-semibold text-text-muted">
            {name || t('Car')}
          </div>
        )}
        {badge && (
          <span className={`absolute right-3 top-3 rounded-md px-3 py-1 text-sm font-semibold text-white shadow ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 truncate text-base font-semibold tracking-wide text-text">
            {name}{' '}
            <span className="text-sm font-normal tracking-normal text-text-muted">{car.year}</span>
          </h3>
        </div>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
        <p className="mt-1 flex items-center gap-1.5 text-sm text-text">
          {hasRating && rating !== null ? (
            <>
              <Icon name="star" className="h-4 w-4 text-warning" />
              <span className="font-semibold tabular-nums">{rating.toFixed(1)}</span>
              <span className="text-text-muted">{t('({count} reviews)', { count: reviews })}</span>
              {owner?.name && <span className="min-w-0 truncate text-text-muted">· {owner.name}</span>}
            </>
          ) : (
            <>
              <Icon name="star" className="h-4 w-4 text-text-muted" />
              <span className="text-text-muted">{t('New')}</span>
              {owner?.name && <span className="min-w-0 truncate text-text-muted">· {owner.name}</span>}
            </>
          )}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {car.fuelType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Icon name={car.fuelType === 'Electric' ? 'electric' : 'fuel'} className="h-4 w-4" />
              {fuelLabel(t, car.fuelType)}
            </span>
          )}
          {car.transmission && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-sm text-text">
              <Icon name="transmission" className="h-4 w-4" />
              {transmissionLabel(t, car.transmission)}
            </span>
          )}
          {bags > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-sm text-text">
              <Icon name="bags" className="h-4 w-4" />
              {t('{count} bags', { count: bags })}
            </span>
          )}
          {car.mileagePolicy && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-sm text-text">
              <Icon name="mileage" className="h-4 w-4" />
              {mileageLabel(t, car.mileagePolicy)}
            </span>
          )}
          {car.locationName && (
            <span
              data-testid="car-location-badge"
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-background px-3 py-1 text-sm text-text"
            >
              <Icon name="location" className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate">{t(car.locationName)}</span>
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p data-testid="car-price" className="whitespace-nowrap text-lg font-bold tabular-nums text-text">
              {t('{price}/day', { price: money(rate) })}
            </p>
            <p className="text-sm text-text-muted">{t('per day')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="heart-btn"
              aria-pressed={saved}
              aria-label={saved ? t('Remove from saved') : t('Save car')}
              onClick={heart}
              onKeyDown={(e) => e.stopPropagation()}
              className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-surface transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${saved ? 'text-danger' : 'text-text-muted'}`}
            >
              <Icon name="heart" className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
            </button>
            <span className="whitespace-nowrap text-sm font-semibold text-primary group-hover:underline">{t('View deal')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
