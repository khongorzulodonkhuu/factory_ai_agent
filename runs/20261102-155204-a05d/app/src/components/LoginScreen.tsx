import { useT, LanguageToggle } from '../i18n';
import type { User, Role } from '../types';
import { roleLabel } from '../lib/labels';

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

function pickUser(users: User[], role: Role, preferredId: string): User | undefined {
  return users.find((u) => u.id === preferredId && u.role === role) ?? users.find((u) => u.role === role);
}

export default function LoginScreen(props: { users: User[]; onLogin: (userId: string) => void }) {
  const t = useT();
  const owner = pickUser(props.users, 'owner', 'o1');
  const renter = pickUser(props.users, 'renter', 'r1');

  const cards: { user: User; role: Role; testId: string; button: string; blurb: string }[] = [];
  if (owner) {
    cards.push({
      user: owner,
      role: 'owner',
      testId: 'login-as-owner',
      button: t('Log in as Owner'),
      blurb: t('List your cars, set prices and approve booking requests.'),
    });
  }
  if (renter) {
    cards.push({
      user: renter,
      role: 'renter',
      testId: 'login-as-renter',
      button: t('Log in as Renter'),
      blurb: t('Browse cars from local owners and request a booking.'),
    });
  }

  return (
    <div data-testid="login-screen" className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-surface shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-[72px] flex items-center gap-6">
          <div className="self-stretch -my-px flex items-center bg-primary px-6">
            <span className="text-xl font-extrabold tracking-tight text-white">Wheels2Go</span>
          </div>
          <div className="ml-auto flex items-center">
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text [text-wrap:balance]">
            {t('Welcome to Wheels2Go')}
          </h1>
          <p className="mt-3 text-base text-text-muted [text-wrap:balance]">
            {t('Choose how you want to continue. No password needed.')}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {cards.map((c) => {
            const rating = typeof c.user.rating === 'number' && Number.isFinite(c.user.rating) ? c.user.rating : null;
            return (
              <div
                key={c.testId}
                className="flex flex-col rounded-card border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-primary/10 text-primary text-lg font-bold grid place-items-center">
                    {initials(c.user.name)}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {roleLabel(t, c.role)}
                    </span>
                    <p className="mt-1 text-lg font-semibold text-text truncate">{c.user.name}</p>
                    {rating !== null && (
                      <p className="text-sm text-text-muted tabular-nums">
                        {t('Owner rating {rating}/10', { rating: rating.toFixed(1) })}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm text-text-muted">{c.blurb}</p>
                <button
                  type="button"
                  data-testid={c.testId}
                  onClick={() => props.onLogin(c.user.id)}
                  className="mt-6 min-h-11 w-full whitespace-normal rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {c.button}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
