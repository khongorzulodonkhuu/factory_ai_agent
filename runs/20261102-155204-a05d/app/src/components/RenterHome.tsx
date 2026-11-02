import { useMemo, useRef, useState } from 'react';
import type { AppState, BodyType, Car, Filters, FuelType, SortOption, Transmission } from '../types';
import { PAGE_SIZE, defaultFilters, distinctMakes, filterCars, ownerOf, sortCars, topPicks } from '../lib/filters';
import { bodyTypeLabel, fuelLabel, transmissionLabel } from '../lib/labels';
import CarCard from './CarCard';
import { useCurrency, useMoney, useT } from '../i18n';
import { Icon } from '../icons';

const FUELS: FuelType[] = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS: Transmission[] = ['Automatic', 'Manual'];
const BODIES: BodyType[] = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Coupe'];

const inputCls =
  'h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const selectCls = inputCls + ' appearance-none pr-10 cursor-pointer';
const labelCls = 'mb-1.5 block text-sm font-medium text-text';

function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function SelectWrap(props: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {props.children}
      <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
    </div>
  );
}

export default function RenterHome(props: {
  state: AppState;
  userId: string;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  page: number;
  onPageChange: (p: number) => void;
  pickupDate: string;
  returnDate: string;
  onDatesChange: (pickupDate: string, returnDate: string) => void;
  onOpenCar: (carId: string) => void;
  onToggleSave: (carId: string) => void;
}) {
  const { state, userId, filters, sort, page } = props;
  const t = useT();
  const money = useMoney();
  const cur = useCurrency();
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [heroFailed, setHeroFailed] = useState(false);

  const allMake = defaultFilters().make;
  const available = useMemo(() => state.cars.filter((c) => c.available), [state.cars]);
  const makes = useMemo(() => distinctMakes(available), [available]);
  const filtered = useMemo(() => filterCars(available, filters), [available, filters]);
  const sorted = useMemo(() => sortCars(filtered, sort), [filtered, sort]);
  const picks = useMemo(() => topPicks(available, state.users, 4), [available, state.users]);
  const heroCar: Car | undefined = picks[0];

  const maxPriceUsd = useMemo(() => {
    const rates = available.map((c) => Number(c.dailyRate) || 0);
    return Math.max(100, Math.ceil(Math.max(0, ...rates)));
  }, [available]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page || 1), totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, currentPage * PAGE_SIZE);

  const isSaved = (carId: string) => state.saved.some((s) => s.userId === userId && s.carId === carId);

  const update = (patch: Partial<Filters>) => {
    props.onFiltersChange({ ...filters, ...patch });
    props.onPageChange(1);
  };

  const clearFilters = () => {
    props.onFiltersChange(defaultFilters());
    props.onPageChange(1);
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToPage = (p: number) => {
    props.onPageChange(Math.min(Math.max(1, p), totalPages));
    scrollToResults();
  };

  const toDisplay = (usd: number) => Math.round(cur.fromUsd(usd) * 100) / 100;
  const rateDisplay = filters.maxRate == null ? '' : String(toDisplay(filters.maxRate));
  const sliderMax = toDisplay(maxPriceUsd);
  const sliderValue = filters.maxRate == null ? sliderMax : toDisplay(filters.maxRate);

  const setRateFromDisplay = (raw: string) => {
    if (raw.trim() === '') {
      update({ maxRate: null });
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    update({ maxRate: cur.toUsd(n) });
  };

  const makeCount = (make: string) => available.filter((c) => c.make === make).length;
  const isAllMake = !filters.make || filters.make === allMake || filters.make === 'All';

  const today = localToday();
  const heroName = heroCar ? [heroCar.make, heroCar.model].filter(Boolean).join(' ') : '';

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative h-[340px] sm:h-[420px] overflow-hidden">
        {heroCar && heroCar.imageUrl && !heroFailed ? (
          <img
            src={heroCar.imageUrl}
            alt={heroName}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setHeroFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark" />
        )}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-28 sm:bottom-32 mx-auto max-w-3xl px-4 text-center text-white">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight [text-wrap:balance] drop-shadow-lg">
            {t('Find your next car')}
          </h1>
          <p className="mt-3 mx-auto max-w-2xl text-base sm:text-lg text-white/85 [text-wrap:balance] drop-shadow-lg">
            {t('Rent a car from local owners, with the full price before you book.')}
          </p>
        </div>
      </section>

      {/* Search card */}
      <div className="px-4 sm:px-6">
        <section
          id="search-card"
          aria-label={t('Find your car')}
          className="relative z-10 -mt-24 mx-auto max-w-6xl rounded-2xl bg-surface p-5 sm:p-6 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text">{t('Find your car')}</h2>
            <button
              type="button"
              data-testid="clear-filters-btn"
              onClick={clearFilters}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {t('Clear filters')}
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="filter-make" className={labelCls}>{t('Make')}</label>
              <SelectWrap>
                <select
                  id="filter-make"
                  data-testid="filter-make"
                  className={selectCls}
                  value={isAllMake ? allMake : filters.make}
                  onChange={(e) => update({ make: e.target.value })}
                >
                  <option value={allMake}>{t('All makes')}</option>
                  {makes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </SelectWrap>
            </div>
            <div>
              <label htmlFor="filter-fuel-type" className={labelCls}>{t('Fuel type')}</label>
              <SelectWrap>
                <select
                  id="filter-fuel-type"
                  data-testid="filter-fuel-type"
                  className={selectCls}
                  value={filters.fuelType}
                  onChange={(e) => update({ fuelType: e.target.value as Filters['fuelType'] })}
                >
                  <option value="All">{t('All fuel types')}</option>
                  {FUELS.map((f) => (
                    <option key={f} value={f}>{fuelLabel(t, f)}</option>
                  ))}
                </select>
              </SelectWrap>
            </div>
            <div>
              <label htmlFor="filter-body-type" className={labelCls}>{t('Body type')}</label>
              <SelectWrap>
                <select
                  id="filter-body-type"
                  data-testid="filter-body-type"
                  className={selectCls}
                  value={filters.bodyType}
                  onChange={(e) => update({ bodyType: e.target.value as Filters['bodyType'] })}
                >
                  <option value="All">{t('All body types')}</option>
                  {BODIES.map((b) => (
                    <option key={b} value={b}>{bodyTypeLabel(t, b)}</option>
                  ))}
                </select>
              </SelectWrap>
            </div>
            <div>
              <label htmlFor="filter-transmission" className={labelCls}>{t('Transmission')}</label>
              <SelectWrap>
                <select
                  id="filter-transmission"
                  data-testid="filter-transmission"
                  className={selectCls}
                  value={filters.transmission}
                  onChange={(e) => update({ transmission: e.target.value as Filters['transmission'] })}
                >
                  <option value="All">{t('All transmissions')}</option>
                  {TRANSMISSIONS.map((tr) => (
                    <option key={tr} value={tr}>{transmissionLabel(t, tr)}</option>
                  ))}
                </select>
              </SelectWrap>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
            <div className="min-w-0">
              <label htmlFor="filter-max-rate" className={labelCls}>
                {t('Max daily rate ({code})', { code: cur.code })}
              </label>
              <input
                type="range"
                aria-label={t('Max daily rate ({code})', { code: cur.code })}
                min={0}
                max={sliderMax}
                step={cur.step}
                value={sliderValue}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= sliderMax) update({ maxRate: null });
                  else setRateFromDisplay(e.target.value);
                }}
                className="w-full min-w-[10rem] accent-primary"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="relative w-44">
                  <input
                    id="filter-max-rate"
                    data-testid="filter-max-rate"
                    type="number"
                    min={0}
                    step={cur.step}
                    inputMode="decimal"
                    placeholder={t('Any')}
                    className={inputCls + ' pr-14 tabular-nums'}
                    value={rateDisplay}
                    onChange={(e) => setRateFromDisplay(e.target.value)}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                    {cur.code}
                  </span>
                </div>
                <span className="text-sm text-text-muted tabular-nums">
                  {filters.maxRate == null
                    ? t('Any price')
                    : t('Up to {amount} per day', { amount: money(filters.maxRate) })}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="hero-pickup-date" className={labelCls}>{t('Pickup')}</label>
                <input
                  id="hero-pickup-date"
                  data-testid="hero-pickup-date"
                  type="date"
                  min={today}
                  className={inputCls}
                  value={props.pickupDate}
                  onChange={(e) => props.onDatesChange(e.target.value, props.returnDate)}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="hero-return-date" className={labelCls}>{t('Return')}</label>
                <input
                  id="hero-return-date"
                  data-testid="hero-return-date"
                  type="date"
                  min={props.pickupDate || today}
                  className={inputCls}
                  value={props.returnDate}
                  onChange={(e) => props.onDatesChange(props.pickupDate, e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="filter-location" className={labelCls}>{t('Location keyword')}</label>
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  id="filter-location"
                  data-testid="filter-location"
                  type="search"
                  placeholder={t('City, airport or address')}
                  className={inputCls + ' pl-10'}
                  value={filters.location}
                  onChange={(e) => update({ location: e.target.value })}
                />
              </div>
            </div>
            <button
              type="button"
              data-testid="show-results-btn"
              onClick={scrollToResults}
              className="h-12 whitespace-normal rounded-lg bg-primary px-6 text-sm font-bold uppercase tracking-wide text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {t('Show results ({count} cars)', { count: total })}
            </button>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Results */}
        <div ref={resultsRef} id="results" className="scroll-mt-24">
          <nav aria-label={t('Makes')} className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:justify-between">
            <button
              type="button"
              data-testid="make-chip-all"
              aria-pressed={isAllMake}
              onClick={() => update({ make: allMake })}
              className={`text-2xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md ${isAllMake ? 'text-primary' : 'text-text-muted/60 hover:text-text'}`}
            >
              {t('All')}
            </button>
            {makes.map((m) => {
              const active = !isAllMake && filters.make === m;
              return (
                <button
                  key={m}
                  type="button"
                  data-testid="make-chip"
                  aria-pressed={active}
                  onClick={() => update({ make: m })}
                  className={`text-2xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md ${active ? 'text-primary' : 'text-text-muted/60 hover:text-text'}`}
                >
                  {m}
                  <sup className="ml-0.5 text-xs font-semibold">{makeCount(m)}</sup>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-text">
              {t('{count} cars available', { count: total })}
            </h2>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-text-muted whitespace-nowrap">{t('Sort by')}</label>
              <div className="relative w-52">
                <select
                  id="sort-select"
                  data-testid="sort-select"
                  className={selectCls}
                  value={sort}
                  onChange={(e) => {
                    props.onSortChange(e.target.value as SortOption);
                    props.onPageChange(1);
                  }}
                >
                  <option value="newest">{t('Newest')}</option>
                  <option value="price-asc">{t('Price: low to high')}</option>
                  <option value="price-desc">{t('Price: high to low')}</option>
                </select>
                <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>
          </div>

          {total === 0 ? (
            <div
              data-testid="catalog-empty"
              className="mt-6 rounded-card border border-border bg-surface p-10 text-center shadow-sm"
            >
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon name="search" className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-semibold text-text">{t('No cars match your filters')}</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {t('Clear filters')}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  owner={ownerOf(state.users, car.ownerId)}
                  saved={isSaved(car.id)}
                  onOpen={props.onOpenCar}
                  onToggleSave={props.onToggleSave}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="Pagination" data-testid="pagination" className="mt-8 flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  data-testid="page-prev"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {t('Previous')}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    data-testid="page-btn"
                    aria-current={p === currentPage ? 'page' : undefined}
                    onClick={() => goToPage(p)}
                    className={`h-9 min-w-9 rounded-lg px-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${p === currentPage ? 'bg-primary text-white' : 'border border-border bg-surface text-text hover:bg-background'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  data-testid="page-next"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {t('Next')}
                </button>
              </div>
              <p className="text-sm text-text-muted tabular-nums">
                {t('Showing {from}-{to} of {total}', { from, to, total })}
              </p>
            </nav>
          )}
        </div>

        {/* Reassurance */}
        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: 'info' as const, text: t('Full price breakdown before you book') },
            { icon: 'location' as const, text: t('Exact pickup address and instructions') },
            { icon: 'check' as const, text: t('Owners confirm every request') },
          ].map((p) => (
            <div key={p.icon} className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon name={p.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-sm font-medium text-text">{p.text}</span>
            </div>
          ))}
        </section>

        {/* Top picks */}
        {picks.length > 0 && (
          <section className="mt-16">
            <h2 className="text-center text-3xl font-bold text-text">{t('Top picks this week')} 🔥</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {picks.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  owner={ownerOf(state.users, car.ownerId)}
                  saved={isSaved(car.id)}
                  onOpen={props.onOpenCar}
                  onToggleSave={props.onToggleSave}
                  variant="top-pick"
                />
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="faq" data-testid="faq" className="mt-16 scroll-mt-24">
          <h2 className="text-2xl font-semibold text-text">{t('Frequently asked questions')}</h2>
          <div className="mt-6 space-y-3">
            {[
              {
                q: t('How is the price calculated?'),
                a: t('Total = Days x Daily Rate + Cleaning Fee. You see the full breakdown before you send a request.'),
              },
              {
                q: t('How are rental days counted?'),
                a: t('Days are the calendar days between the pickup date and the return date. Pickup and return times do not change the price.'),
              },
              {
                q: t('What is the cleaning fee?'),
                a: t('Each owner sets a one-time cleaning fee per booking. It is added once to the total, whatever the length of the rental.'),
              },
              {
                q: t('When is my booking confirmed?'),
                a: t('Your request stays Pending until the owner clicks Approve or Decline. You can follow the status in My bookings.'),
              },
            ].map((item) => (
              <details key={item.q} className="group rounded-card border border-border bg-surface p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-text">
                  <span className="min-w-0">{item.q}</span>
                  <Icon name="chevron" className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
