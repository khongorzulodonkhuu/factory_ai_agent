import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { BodyType, Car, CarDraft, CarErrors, CarInput, FuelType, LocationType, Transmission } from '../types';
import { carToDraft, draftToCarInput, emptyDraft, validateCarDraft } from '../lib/carForm';
import { bodyTypeLabel, carErrorLabel, fuelLabel, locationTypeLabel, transmissionLabel } from '../lib/labels';
import { useCurrency, useT } from '../i18n';
import { Icon } from '../icons';

const FUELS: FuelType[] = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS: Transmission[] = ['Automatic', 'Manual'];
const BODIES: BodyType[] = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Coupe'];
const LOCATION_TYPES: LocationType[] = ['City', 'Airport Hub', 'Specific Address'];

const inputCls =
  'h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
const labelCls = 'mb-1.5 block text-sm font-medium text-text';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function CarForm(props: { initial?: Car; onSave: (input: CarInput) => void; onCancel: () => void }) {
  const { initial, onSave, onCancel } = props;
  const t = useT();
  const cur = useCurrency();
  const [draft, setDraft] = useState<CarDraft>(() => (initial ? carToDraft(initial) : emptyDraft()));
  const [submitted, setSubmitted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const toDisplay = (usd: string): string => {
    if (usd.trim() === '') return '';
    const n = Number(usd);
    if (!Number.isFinite(n)) return usd;
    return String(round2(cur.fromUsd(n)));
  };

  const [rateDisplay, setRateDisplay] = useState<string>(() => toDisplay(draft.dailyRate));
  const [feeDisplay, setFeeDisplay] = useState<string>(() => toDisplay(draft.cleaningFee));

  useEffect(() => {
    setRateDisplay(toDisplay(draft.dailyRate));
    setFeeDisplay(toDisplay(draft.cleaningFee));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.code]);

  useEffect(() => {
    setImgFailed(false);
  }, [draft.imageUrl]);

  const errors: CarErrors = submitted ? validateCarDraft(draft) : {};

  const set = <K extends keyof CarDraft>(key: K, value: CarDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const setMoney = (key: 'dailyRate' | 'cleaningFee', typed: string) => {
    if (key === 'dailyRate') setRateDisplay(typed);
    else setFeeDisplay(typed);
    if (typed.trim() === '') {
      set(key, '');
      return;
    }
    const n = Number(typed);
    set(key, Number.isFinite(n) ? String(round2(cur.toUsd(n))) : typed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validateCarDraft(draft);
    if (Object.keys(errs).length > 0) return;
    onSave(draftToCarInput(draft));
  };

  const errorFor = (key: keyof CarDraft): ReactNode => {
    const code = errors[key];
    if (!code) return null;
    if (code === 'location-required') {
      return (
        <p data-testid="field-error" className="mt-1.5 text-sm text-danger">
          <span data-testid="location-error">{carErrorLabel(t, code)}</span>
        </p>
      );
    }
    return (
      <p data-testid="field-error" className="mt-1.5 text-sm text-danger">
        {carErrorLabel(t, code)}
      </p>
    );
  };

  const errCls = (key: keyof CarDraft) => (errors[key] ? ' border-danger' : '');

  const req = <span className="text-danger" aria-hidden="true"> *</span>;

  const selectWrap = (children: ReactNode) => (
    <div className="relative">
      {children}
      <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
    </div>
  );

  const sectionCls = 'rounded-card border border-border bg-surface p-5 sm:p-6 shadow-sm';
  const title = initial ? t('Edit car') : t('Add car');
  const previewName = [draft.make, draft.model].filter((s) => s.trim() !== '').join(' ');

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('Fields marked * are required. Other details have sensible defaults.')}</p>
      </div>

      <form data-testid="car-form" noValidate onSubmit={handleSubmit} className="space-y-6">
        <section className={sectionCls}>
          <h2 className="mb-4 text-lg font-semibold text-text">{t('Car details')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="car-make" className={labelCls}>{t('Make')}{req}</label>
              <input id="car-make" data-testid="car-make" className={inputCls + errCls('make')} value={draft.make} onChange={(e) => set('make', e.target.value)} placeholder={t('e.g. Toyota')} />
              {errorFor('make')}
            </div>
            <div>
              <label htmlFor="car-model" className={labelCls}>{t('Model')}{req}</label>
              <input id="car-model" data-testid="car-model" className={inputCls + errCls('model')} value={draft.model} onChange={(e) => set('model', e.target.value)} placeholder={t('e.g. Prius')} />
              {errorFor('model')}
            </div>
            <div>
              <label htmlFor="car-year" className={labelCls}>{t('Year')}{req}</label>
              <input id="car-year" data-testid="car-year" inputMode="numeric" className={inputCls + errCls('year')} value={draft.year} onChange={(e) => set('year', e.target.value)} placeholder="2022" />
              {errorFor('year')}
            </div>
            <div>
              <label htmlFor="car-fuel" className={labelCls}>{t('Fuel/EV type')}{req}</label>
              {selectWrap(
                <select id="car-fuel" data-testid="car-fuel" className={inputCls + ' appearance-none pr-10 cursor-pointer' + errCls('fuelType')} value={draft.fuelType} onChange={(e) => set('fuelType', e.target.value as FuelType | '')}>
                  {draft.fuelType === '' && <option value="">{t('Select...')}</option>}
                  {FUELS.map((f) => (
                    <option key={f} value={f}>{fuelLabel(t, f)}</option>
                  ))}
                </select>,
              )}
              {errorFor('fuelType')}
            </div>
            <div>
              <label htmlFor="car-transmission" className={labelCls}>{t('Transmission')}{req}</label>
              {selectWrap(
                <select id="car-transmission" data-testid="car-transmission" className={inputCls + ' appearance-none pr-10 cursor-pointer' + errCls('transmission')} value={draft.transmission} onChange={(e) => set('transmission', e.target.value as Transmission | '')}>
                  {draft.transmission === '' && <option value="">{t('Select...')}</option>}
                  {TRANSMISSIONS.map((v) => (
                    <option key={v} value={v}>{transmissionLabel(t, v)}</option>
                  ))}
                </select>,
              )}
              {errorFor('transmission')}
            </div>
            <div>
              <label htmlFor="car-body-type" className={labelCls}>{t('Body type')}</label>
              {selectWrap(
                <select id="car-body-type" data-testid="car-body-type" className={inputCls + ' appearance-none pr-10 cursor-pointer'} value={draft.bodyType} onChange={(e) => set('bodyType', e.target.value as BodyType)}>
                  {BODIES.map((b) => (
                    <option key={b} value={b}>{bodyTypeLabel(t, b)}</option>
                  ))}
                </select>,
              )}
              {errorFor('bodyType')}
            </div>
            <div>
              <label htmlFor="car-seats" className={labelCls}>{t('Seats')}</label>
              <input id="car-seats" data-testid="car-seats" type="number" min={1} className={inputCls + errCls('seats')} value={draft.seats} onChange={(e) => set('seats', e.target.value)} />
              {errorFor('seats')}
            </div>
            <div>
              <label htmlFor="car-bags" className={labelCls}>{t('Luggage bags')}</label>
              <input id="car-bags" data-testid="car-bags" type="number" min={0} className={inputCls + errCls('bags')} value={draft.bags} onChange={(e) => set('bags', e.target.value)} />
              {errorFor('bags')}
            </div>
            <div>
              <label htmlFor="car-odometer" className={labelCls}>{t('Odometer')}</label>
              <div className="relative">
                <input id="car-odometer" data-testid="car-odometer" type="number" min={0} className={inputCls + ' pr-14' + errCls('odometerKm')} value={draft.odometerKm} onChange={(e) => set('odometerKm', e.target.value)} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">km</span>
              </div>
              {errorFor('odometerKm')}
            </div>
            <div>
              <label htmlFor="car-mileage" className={labelCls}>{t('Mileage policy')}</label>
              <input id="car-mileage" data-testid="car-mileage" className={inputCls + errCls('mileagePolicy')} value={draft.mileagePolicy} onChange={(e) => set('mileagePolicy', e.target.value)} placeholder={t('Unlimited or e.g. 300 km/day')} />
              {errorFor('mileagePolicy')}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="car-image-url" className={labelCls}>{t('Image URL')}{req}</label>
              <input id="car-image-url" data-testid="car-image-url" type="url" className={inputCls + errCls('imageUrl')} value={draft.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
              {errorFor('imageUrl')}
              {draft.imageUrl.trim() !== '' && (
                <div className="mt-3 w-full max-w-xs overflow-hidden rounded-lg border border-border">
                  {imgFailed ? (
                    <div className="flex aspect-[16/10] w-full items-center justify-center bg-surface px-3 text-center text-sm text-text-muted">
                      {previewName || t('Image preview unavailable')}
                    </div>
                  ) : (
                    <img src={draft.imageUrl} alt={previewName || t('Car image preview')} className="aspect-[16/10] w-full object-cover" onError={() => setImgFailed(true)} />
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className="mb-4 text-lg font-semibold text-text">{t('Pricing')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="car-daily-rate" className={labelCls}>{t('Daily rental rate ({code})', { code: cur.code })}{req}</label>
              <div className="relative">
                <input id="car-daily-rate" data-testid="car-daily-rate" type="number" min={0} step={cur.step} className={inputCls + ' pr-14 tabular-nums' + errCls('dailyRate')} value={rateDisplay} onChange={(e) => setMoney('dailyRate', e.target.value)} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{cur.code}</span>
              </div>
              {errorFor('dailyRate')}
            </div>
            <div>
              <label htmlFor="car-cleaning-fee" className={labelCls}>{t('Cleaning fee ({code})', { code: cur.code })}{req}</label>
              <div className="relative">
                <input id="car-cleaning-fee" data-testid="car-cleaning-fee" type="number" min={0} step={cur.step} className={inputCls + ' pr-14 tabular-nums' + errCls('cleaningFee')} value={feeDisplay} onChange={(e) => setMoney('cleaningFee', e.target.value)} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">{cur.code}</span>
              </div>
              <p className="mt-1.5 text-xs text-text-muted">{t('Charged once per booking. Use 0 for no fee.')}</p>
              {errorFor('cleaningFee')}
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className="mb-4 text-lg font-semibold text-text">{t('Pickup/Drop-off location')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="car-location-type" className={labelCls}>{t('Location type')}{req}</label>
              {selectWrap(
                <select id="car-location-type" data-testid="car-location-type" className={inputCls + ' appearance-none pr-10 cursor-pointer' + errCls('locationType')} value={draft.locationType} onChange={(e) => set('locationType', e.target.value as LocationType | '')}>
                  <option value="">{t('Select...')}</option>
                  {LOCATION_TYPES.map((l) => (
                    <option key={l} value={l}>{locationTypeLabel(t, l)}</option>
                  ))}
                </select>,
              )}
              {errorFor('locationType')}
            </div>
            <div>
              <label htmlFor="car-location-name" className={labelCls}>{t('Location name')}{req}</label>
              <input id="car-location-name" data-testid="car-location-name" className={inputCls + errCls('locationName')} value={draft.locationName} onChange={(e) => set('locationName', e.target.value)} placeholder={t('e.g. Chinggis Khaan International Airport')} />
              {errorFor('locationName')}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="car-address" className={labelCls}>{t('Full pickup address')}</label>
              <input id="car-address" data-testid="car-address" className={inputCls + errCls('pickupAddress')} value={draft.pickupAddress} onChange={(e) => set('pickupAddress', e.target.value)} placeholder={t('Street, district, city, country')} />
              {errorFor('pickupAddress')}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="car-instructions" className={labelCls}>{t('Pickup instructions')}</label>
              <textarea id="car-instructions" data-testid="car-instructions" rows={3} className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" value={draft.pickupInstructions} onChange={(e) => set('pickupInstructions', e.target.value)} placeholder={t('e.g. Meet at the lobby entrance')} />
              {errorFor('pickupInstructions')}
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" data-testid="car-cancel-btn" onClick={onCancel} className="min-h-10 rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-text hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {t('Cancel')}
          </button>
          <button type="submit" data-testid="car-save-btn" className="min-h-10 rounded-lg bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50">
            {t('Save')}
          </button>
        </div>
      </form>
    </div>
  );
}
