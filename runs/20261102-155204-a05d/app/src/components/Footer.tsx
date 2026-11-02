import { LanguageToggle, useT } from '../i18n';

export default function Footer() {
  const t = useT();
  const year = new Date().getFullYear();

  const columns: { heading: string; items: string[] }[] = [
    { heading: t('For renters'), items: [t('Browse cars'), t('Saved cars'), t('My bookings')] },
    { heading: t('For owners'), items: [t('List a car'), t('Booking requests'), t('Dashboard')] },
  ];

  return (
    <footer data-testid="site-footer" className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-primary">Wheels2Go</div>
            <p className="mt-2 text-sm text-text-muted">
              {t('Rent cars from local owners, with the full price shown before you book.')}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.heading} className="min-w-0">
              <h3 className="text-sm font-semibold text-text">{col.heading}</h3>
              <ul className="mt-3 space-y-2">
                {col.items.map((item) => (
                  <li key={item} className="text-sm text-text-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text">Wheels2Go</h3>
            <ul className="mt-3 space-y-2">
              <li className="text-sm text-text-muted">{t('Total = Days x Daily Rate + Cleaning Fee')}</li>
              <li className="text-sm text-text-muted">{t('Owners confirm every request')}</li>
              <li className="pt-1">
                <LanguageToggle />
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-text-muted">
          <span>{t('© {year} Wheels2Go', { year })}</span>
          <span>{t('Prices in USD · shown in ₮ in Mongolian')}</span>
        </div>
      </div>
    </footer>
  );
}
