import { useState } from 'react';
import type { Booking, Car, User } from '../types';
import { useT, useMoney, useCurrency } from '../i18n';
import { Icon } from '../icons';
import { priceBreakdown, isValidRange, todayISO, timeOptions } from '../lib/pricing';
import {
  fuelLabel,
  transmissionLabel,
  bodyTypeLabel,
  locationTypeLabel,
  mileageLabel,
  formatDateTime,
} from '../lib/labels';

const inputCls =
  'h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function num(v: unknown, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

export default function CarDetails(props: {
  car: Car;
  owner?: User;
  saved: boolean;
  initialPickupDate: string;
  initialReturnDate: string;
  onBack: () => void;
  onToggleSave: (carId: string) => void;
  onRequestBooking: (params: { pickupDate: string; pickupTime: string; returnDate: string; returnTime: string }) => Booking | null;
  onViewBookings: () => void;
}) {
  const { car, owner, saved, onBack, onToggleSave, onRequestBooking, onViewBookings } = props;
  const t = useT();
  const money = useMoney();
  const cur = useCurrency();
  const mongolian = cur.code !== 'USD';
  const today = todayISO();
  const times = timeOptions();

  const [pickupDate, setPickupDate] = useState(props.initialPickupDate || '');
  const [returnDate, setReturnDate] = useState(props.initialReturnDate || '');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('10:00');
  const [imgFailed, setImgFailed] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);

  const dailyRate = num(car.dailyRate);
  const cleaningFee = num(car.cleaningFee);
  const title = [car.make, car.model, car.year ? String(car.year) : ''].filter(Boolean).join(' ');

  const bothDates = Boolean(pickupDate && returnDate);
  const validRange = bothDates && isValidRange(pickupDate, returnDate);
  const pastPickup = Boolean(pickupDate) && pickupDate < today;
  const breakdown = validRange
    ? priceBreakdown({ dailyRate, cleaningFee }, pickupDate, returnDate)
    : { days: 0, dailyRate, cleaningFee, total: cleaningFee };
  const days = Math.max(0, num(breakdown.days));
  const total = num(breakdown.total, cleaningFee);
  const canSubmit = validRange && !pastPickup;

  const submit = () => {
    if (!canSubmit) return;
    const b = onRequestBooking({ pickupDate, pickupTime, returnDate, returnTime });
    if (b) setBooking(b);
  };

  const step = booking ? 3 : 2;
  const steps = [t('Choose car'), t('Dates & price'), t('Request sent')];

  const specs: { label: string; value: string; testId?: string }[] = [
    { label: t('Make'), value: car.make },
    { label: t('Model'), value: car.model },
    { label: t('Year'), value: car.year ? String(car.year) : '' },
    { label: t('Body type'), value: car.bodyType ? bodyTypeLabel(t, car.bodyType) : '' },
    { label: t('Fuel type'), value: car.fuelType ? fuelLabel(t, car.fuelType) : '' },
    { label: t('Transmission'), value: car.transmission ? transmissionLabel(t, car.transmission) : '' },
    { label: t('Seats'), value: t('{count} seats', { count: num(car.seats, 5) }) },
    { label: t('Luggage bags'), value: t('{count} bags', { count: num(car.bags, 2) }) },
    { label: t('Odometer'), value: t('{km} km', { km: num(car.odometerKm).toLocaleString('en-US') }) },
    { label: t('Mileage policy'), value: car.mileagePolicy ? mileageLabel(t, car.mileagePolicy) : '' },
    { label: t('Daily rate'), value: money(dailyRate) },
    { label: t('Cleaning fee'), value: money(cleaningFee), testId: 'detail-cleaning-fee' },
  ].filter((s) => s.value);

  const included = [
    car.pickupInstructions ? t('Pickup instructions from the owner') : '',
    t('Cleaning fee: {amount}', { amount: money(cleaningFee) }),
    t('{count} seats', { count: num(car.seats, 5) }),
    car.transmission ? transmissionLabel(t, car.transmission) : '',
  ].filter(Boolean);

  const ownerRating = owner && typeof owner.rating === 'number' && num(owner.reviewCount) > 0 ? owner.rating : null;

  const timeSelect = (value: string, onChange: (v: string) => void, testId: string, label: string) => (
    <div className="relative">
      <select
        aria-label={label}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} appearance-none pr-10 cursor-pointer`}
      >
        {times.map((tm) => (
          <option key={tm} value={tm}>
            {tm}
          </option>
        ))}
      </select>
      <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
    </div>
  );

  return (
    <div data-testid="car-details" className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
      <button
        type="button"
        data-testid="back-btn"
        onClick={onBack}
        className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-text-muted hover:text-primary focus-visible:ring-2 ring-primary/40"
      >
        <Icon name="chevron" className="h-4 w-4 rotate-90" />
        {t('Back to cars')}
      </button>

      <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={s} className="flex min-w-0 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  done || active ? 'bg-primary text-white' : 'bg-background text-text-muted border border-border'
                }`}
              >
                {done ? <Icon name="check" className="h-4 w-4" /> : n}
              </span>
              <span className={`whitespace-normal ${active ? 'font-semibold text-text' : 'text-text-muted'}`}>{s}</span>
              {n < steps.length && <span aria-hidden="true" className="mx-1 h-px w-6 bg-border" />}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-text">{title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
            <Icon name="location" className="h-4 w-4" />
            {t(car.locationName)}
          </p>
        </div>
        <button
          type="button"
          data-testid="heart-btn"
          aria-pressed={saved}
          aria-label={saved ? t('Remove from saved') : t('Save car')}
          onClick={() => onToggleSave(car.id)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background focus-visible:ring-2 ring-primary/40 ${
            saved ? 'text-danger' : 'text-text'
          }`}
        >
          <Icon name="heart" className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
          {saved ? t('Saved') : t('Save')}
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-sm">
            {imgFailed || !car.imageUrl ? (
              <div className="grid aspect-[16/10] w-full place-items-center bg-background text-lg font-semibold text-text-muted">
                {title}
              </div>
            ) : (
              <img
                src={car.imageUrl}
                alt={title}
                onError={() => setImgFailed(true)}
                className="aspect-[16/10] w-full object-cover"
              />
            )}
          </div>

          <section className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-text">{t('Specifications')}</h2>
            <dl className="grid gap-x-6 sm:grid-cols-2">
              {specs.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-4 border-b border-border py-2.5 text-sm">
                  <dt className="text-text-muted">{s.label}</dt>
                  <dd data-testid={s.testId} className="text-right font-medium text-text tabular-nums">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-text">{t('Pickup & return')}</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-text-muted">{t('Location type')}</dt>
                <dd data-testid="detail-location-type" className="font-medium text-text">
                  {car.locationType ? locationTypeLabel(t, car.locationType) : ''}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted">{t('Location')}</dt>
                <dd className="font-medium text-text">{t(car.locationName)}</dd>
              </div>
              {car.pickupAddress && (
                <div>
                  <dt className="text-text-muted">{t('Pickup address')}</dt>
                  <dd data-testid="detail-address" className="font-medium text-text">
                    {t(car.pickupAddress)}
                  </dd>
                </div>
              )}
              {car.pickupInstructions && (
                <div>
                  <dt className="text-text-muted">{t('Pickup instructions')}</dt>
                  <dd data-testid="detail-instructions" className="text-text">
                    {t(car.pickupInstructions)}
                  </dd>
                </div>
              )}
            </dl>
            {owner && (
              <div data-testid="car-owner" className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                  {initials(owner.name)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">{t('Car owner')}</p>
                  <p className="text-base font-semibold text-text">{owner.name}</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-sm text-text">
                  <Icon name="star" className="h-4 w-4 text-warning" />
                  {ownerRating !== null ? (
                    <span className="tabular-nums">
                      {t('{rating}/10 ({count} reviews)', { rating: ownerRating.toFixed(1), count: num(owner.reviewCount) })}
                    </span>
                  ) : (
                    <span>{t('New')}</span>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-card border border-border bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-text">{t("What's included")}</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-text">
                  <Icon name="check" className="h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="min-w-0">
          <div className="rounded-card border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-24">
            {booking ? (
              <div data-testid="booking-confirmation" className="space-y-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success">
                  <Icon name="check" className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold text-text">{t('Request sent')}</h2>
                <p className="text-sm text-text-muted">
                  {t('Your booking request is Pending until the owner approves it.')}
                </p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">{t('Pickup')}</dt>
                    <dd className="tabular-nums text-text">{formatDateTime(booking.pickupDate, booking.pickupTime, mongolian)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">{t('Return')}</dt>
                    <dd className="tabular-nums text-text">{formatDateTime(booking.returnDate, booking.returnTime, mongolian)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                    <dt className="font-semibold text-text">{t('Total')}</dt>
                    <dd className="text-2xl font-bold tabular-nums text-text">{money(num(booking.total))}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={onViewBookings}
                  className="min-h-10 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:ring-2 ring-primary/40"
                >
                  {t('View my bookings')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-text">{money(dailyRate)}</p>
                  <p className="text-sm text-text-muted">{t('per day')}</p>
                </div>

                <div>
                  <label htmlFor="pickup-date" className="mb-1.5 block text-sm font-medium text-text">
                    {t('Pickup')}
                  </label>
                  <div className="grid grid-cols-[1fr_7rem] gap-2">
                    <input
                      id="pickup-date"
                      type="date"
                      data-testid="pickup-date"
                      min={today}
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className={inputCls}
                    />
                    {timeSelect(pickupTime, setPickupTime, 'pickup-time', t('Pickup time'))}
                  </div>
                </div>

                <div>
                  <label htmlFor="return-date" className="mb-1.5 block text-sm font-medium text-text">
                    {t('Return')}
                  </label>
                  <div className="grid grid-cols-[1fr_7rem] gap-2">
                    <input
                      id="return-date"
                      type="date"
                      data-testid="return-date"
                      min={pickupDate || today}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className={inputCls}
                    />
                    {timeSelect(returnTime, setReturnTime, 'return-time', t('Return time'))}
                  </div>
                </div>

                {bothDates && !validRange && (
                  <p data-testid="date-error" role="alert" className="text-sm font-medium text-danger">
                    {t('Return must be after pickup')}
                  </p>
                )}
                {pastPickup && (
                  <p role="alert" className="text-sm font-medium text-danger">
                    {t('Pickup date cannot be in the past')}
                  </p>
                )}

                <dl className="space-y-2 border-t border-border pt-4 text-sm">
                  {validRange && (
                    <div className="flex justify-between gap-3 text-text-muted">
                      <dt>{t('Dates')}</dt>
                      <dd className="text-right tabular-nums">
                        {formatDateTime(pickupDate, pickupTime, mongolian)} – {formatDateTime(returnDate, returnTime, mongolian)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">{t('Days')}</dt>
                    <dd data-testid="summary-days" className="font-medium tabular-nums text-text">
                      {days}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">{t('Daily rate')}</dt>
                    <dd data-testid="summary-rate" className="font-medium tabular-nums text-text">
                      {money(dailyRate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-text-muted">{t('Cleaning fee')}</dt>
                    <dd data-testid="summary-cleaning-fee" className="font-medium tabular-nums text-text">
                      {money(cleaningFee)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                    <dt className="font-semibold text-text">{t('Total')}</dt>
                    <dd data-testid="summary-total" className="text-2xl font-bold tabular-nums text-text">
                      {money(total)}
                    </dd>
                  </div>
                  <p className="text-xs text-text-muted">{t('Total = Days x Daily Rate + Cleaning Fee')}</p>
                </dl>

                <button
                  type="button"
                  data-testid="request-booking-btn"
                  onClick={submit}
                  disabled={!canSubmit}
                  className="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary-dark focus-visible:ring-2 ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('Request booking')}
                </button>
                <p className="text-xs text-text-muted">{t('The owner confirms every request before pickup.')}</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
