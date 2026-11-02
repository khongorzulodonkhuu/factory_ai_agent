import { test, expect, Page } from '@playwright/test';

function day(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function login(page: Page, role: 'owner' | 'renter') {
  await expect(page.getByTestId('login-screen')).toBeVisible();
  await page.getByTestId(role === 'owner' ? 'login-as-owner' : 'login-as-renter').click();
  await expect(page.getByTestId('current-user')).toBeVisible();
}

async function openMenuIfNeeded(page: Page, target: string) {
  const el = page.getByTestId(target).first();
  if (!(await el.isVisible())) {
    const menu = page.getByTestId('account-menu-btn');
    if (await menu.count()) await menu.first().click();
  }
}

async function logout(page: Page) {
  await openMenuIfNeeded(page, 'logout-btn');
  await page.getByTestId('logout-btn').first().click();
  await expect(page.getByTestId('login-screen')).toBeVisible();
}

async function go(page: Page, id: string) {
  await openMenuIfNeeded(page, id);
  await page.getByTestId(id).first().click();
}

async function openCard(page: Page, text: RegExp) {
  const card = page.getByTestId('car-card').filter({ hasText: text }).first();
  await expect(card).toBeVisible();
  await card.click({ position: { x: 20, y: 20 } });
  await expect(page.getByTestId('car-details')).toBeVisible();
}

// The logout button lives inside the account menu: open it, check the text, close it again.
async function expectLogoutInMongolian(page: Page) {
  await page.getByTestId('account-menu-btn').first().click();
  const btn = page.getByTestId('logout-btn').first();
  await expect(btn).toBeVisible();
  await expect(btn).not.toContainText(/Log out/i);
  await expect(btn).toContainText(/[А-Яа-яЁёӨөҮү]/);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('logout-btn')).toHaveCount(0);
}

test('F-1: Passwordless quick login and role switching', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('login-screen')).toBeVisible();
  await expect(page.getByTestId('login-as-owner')).toContainText(/owner/i);
  await expect(page.getByTestId('login-as-renter')).toContainText(/renter/i);
  await expect(page.getByTestId('login-screen')).toContainText('Bat-Erdene Ganbold');
  await expect(page.getByTestId('login-screen')).toContainText('Anu Dorj');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('input[type="email"]')).toHaveCount(0);

  await login(page, 'owner');
  await expect(page.getByTestId('current-user')).toContainText('Bat-Erdene Ganbold');
  await expect(page.getByTestId('current-user')).toContainText(/owner/i);
  await expect(page.getByTestId('nav-saved')).toHaveCount(0);
  await expect(page.getByTestId('nav-bookings')).toHaveCount(0);
  await logout(page);

  await login(page, 'renter');
  await expect(page.getByTestId('current-user')).toContainText('Anu Dorj');
  await expect(page.getByTestId('current-user')).toContainText(/renter/i);
  await expect(page.getByTestId('nav-fleet')).toHaveCount(0);
  await expect(page.getByTestId('nav-dashboard')).toHaveCount(0);
  await logout(page);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('F-4: My fleet: edit, availability and delete', async ({ page }) => {
  await page.goto('/');
  await login(page, 'owner');
  await go(page, 'nav-fleet');
  await expect(page.getByTestId('fleet-row')).toHaveCount(6);

  const bmw = page.getByTestId('fleet-row').filter({ hasText: /BMW/ });
  await bmw.getByTestId('fleet-edit-btn').click();
  await expect(page.getByTestId('car-form')).toBeVisible();
  await expect(page.getByTestId('car-make')).toHaveValue('BMW');
  await expect(page.getByTestId('car-model')).toHaveValue('M2');
  await page.getByTestId('car-daily-rate').fill('155');
  await page.getByTestId('car-location-name').fill('Berlin - Kreuzberg');
  await page.getByTestId('car-save-btn').click();
  if (!(await page.getByTestId('fleet-row').first().isVisible())) await go(page, 'nav-fleet');
  await expect(bmw).toContainText('$155.00');
  await expect(bmw).toContainText('Berlin - Kreuzberg');

  const ranger = page.getByTestId('fleet-row').filter({ hasText: /Ranger/ });
  await ranger.getByTestId('fleet-toggle-btn').click();
  await expect(ranger).toContainText(/unavailable/i);

  const staria = page.getByTestId('fleet-row').filter({ hasText: /Staria/ });
  await staria.getByTestId('fleet-delete-btn').click();
  await page.getByTestId('confirm-delete-btn').click();
  await expect(page.getByTestId('fleet-row').filter({ hasText: /Staria/ })).toHaveCount(0);
  await expect(page.getByTestId('fleet-row')).toHaveCount(5);

  await logout(page);
  await login(page, 'renter');
  const loc = page.getByTestId('filter-location');
  await loc.fill('Kreuzberg');
  await expect(page.getByTestId('car-card')).toHaveCount(1);
  await expect(page.getByTestId('car-card').first()).toContainText('$155.00/day');
  await expect(page.getByTestId('car-card').first().getByTestId('car-location-badge')).toContainText('Berlin - Kreuzberg');
  await loc.fill('Zaisan');
  await expect(page.getByTestId('catalog-empty')).toBeVisible();
  await loc.fill('Incheon');
  await expect(page.getByTestId('catalog-empty')).toBeVisible();
  await loc.fill('');
  await expect(page.getByTestId('show-results-btn')).toContainText('6');
});

test('F-5: Car discovery grid', async ({ page }) => {
  await page.goto('/');
  await login(page, 'renter');
  await page.getByTestId('sort-select').selectOption({ label: 'Price: low to high' });
  const first = page.getByTestId('car-card').first();
  await expect(first).toContainText('Honda');
  await expect(first).toContainText('Civic');
  await expect(first).toContainText('$38.00/day');

  await openCard(page, /Civic/);
  const details = page.getByTestId('car-details');
  await expect(details).toContainText('Honda');
  await expect(details).toContainText('2018');
  await expect(details).toContainText('Sedan');
  await expect(details).toContainText('Gasoline');
  await expect(details).toContainText('Manual');
  await expect(details).toContainText(/112[,.\s]?000/);
  await expect(details).toContainText('Unlimited');
  await expect(details).toContainText('$38.00');
  await expect(details).toContainText('Sarah Mitchell');
  await expect(details).toContainText('8.7');
  await expect(page.getByTestId('detail-cleaning-fee').first()).toContainText('$15.00');
  await expect(page.getByTestId('detail-location-type').first()).toContainText('Airport Hub');
  await expect(page.getByTestId('detail-address').first()).toContainText('Heathrow Terminal 5');
  await expect(page.getByTestId('detail-instructions').first()).toContainText('Level 4 lift lobby');

  await page.getByTestId('back-btn').click();
  await page.getByTestId('filter-location').fill('nowhere-xyz');
  await expect(page.getByTestId('catalog-empty')).toBeVisible();
  await expect(page.getByTestId('catalog-empty')).toContainText('No cars match your filters');
  await page.getByTestId('clear-filters-btn').first().click();
  await expect(page.getByTestId('show-results-btn')).toContainText('8');
  await expect(page.getByTestId('car-card')).toHaveCount(6);
});

test('F-5: Pagination', async ({ page }) => {
  await page.goto('/');
  await login(page, 'renter');
  await expect(page.getByTestId('car-card')).toHaveCount(6);
  await page.getByTestId('page-next').click();
  await expect(page.getByTestId('car-card')).toHaveCount(2);
  await page.getByTestId('page-prev').click();
  await expect(page.getByTestId('car-card')).toHaveCount(6);
  await page.getByTestId('page-btn').filter({ hasText: '2' }).click();
  await expect(page.getByTestId('car-card')).toHaveCount(2);
  await page.getByTestId('page-btn').filter({ hasText: '1' }).click();
  await expect(page.getByTestId('car-card')).toHaveCount(6);
});

test('F-7: Home hero, makes strip, top picks and FAQ', async ({ page }) => {
  await page.goto('/');
  await login(page, 'renter');
  await expect(page.getByTestId('show-results-btn')).toContainText(/Show results/i);
  await expect(page.getByTestId('show-results-btn')).toContainText('8');
  await expect(page.getByTestId('top-pick-card')).toHaveCount(4);
  await expect(page.getByTestId('faq')).toContainText(/cleaning fee/i);
  await expect(page.getByTestId('faq')).toContainText(/Pending/i);
  await expect(page.getByTestId('faq')).toContainText(/Approve/);
  await expect(page.getByTestId('faq')).toContainText(/Decline/);

  await page.getByTestId('hero-pickup-date').fill(day(5));
  await page.getByTestId('hero-return-date').fill(day(8));
  await page.getByTestId('make-chip').filter({ hasText: /Tesla/ }).first().click();
  await expect(page.getByTestId('show-results-btn')).toContainText('1');
  await page.getByTestId('show-results-btn').click();
  await expect(page.getByTestId('car-card')).toHaveCount(1);
  await expect(page.getByTestId('car-card').first()).toContainText('Tesla');

  await openCard(page, /Model 3/);
  await expect(page.getByTestId('pickup-date')).toHaveValue(day(5));
  await expect(page.getByTestId('return-date')).toHaveValue(day(8));
  await expect(page.getByTestId('summary-days')).toContainText('3');
  await expect(page.getByTestId('summary-total')).toContainText('$280.00');
});

test('F-8: Pickup and return times appear in the booking', async ({ page }) => {
  await page.goto('/');
  await login(page, 'renter');
  await page.getByTestId('filter-make').selectOption('Tesla');
  await openCard(page, /Model 3/);
  await page.getByTestId('pickup-date').fill(day(7));
  await page.getByTestId('return-date').fill(day(10));
  await page.getByTestId('pickup-time').selectOption('09:30');
  await page.getByTestId('return-time').selectOption('16:30');
  await expect(page.getByTestId('summary-days')).toContainText('3');
  await expect(page.getByTestId('summary-total')).toContainText('$280.00');
  await expect(page.getByTestId('detail-address').first()).toContainText('2150 Mission St');
  await page.getByTestId('request-booking-btn').click();
  await expect(page.getByTestId('booking-confirmation')).toContainText('$280.00');

  await go(page, 'nav-bookings');
  const row = page.getByTestId('booking-row').filter({ hasText: /Model 3/ });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('09:30');
  await expect(row).toContainText('16:30');
  await expect(row).toContainText('$280.00');
  await expect(row).toContainText(/pending/i);
  await expect(row).toContainText('2150 Mission St');
});

test('F-11: My bookings', async ({ page }) => {
  await page.goto('/');
  await login(page, 'renter');
  await go(page, 'nav-bookings');
  await expect(page.getByTestId('bookings-empty')).toBeVisible();
  await expect(page.getByTestId('bookings-empty')).toContainText(/No bookings yet/i);

  await go(page, 'nav-browse');
  await page.getByTestId('filter-make').selectOption('Toyota');
  await openCard(page, /Prius/);
  await page.getByTestId('pickup-date').fill(day(3));
  await page.getByTestId('return-date').fill(day(5));
  await expect(page.getByTestId('summary-total')).toContainText('$105.00');
  await page.getByTestId('request-booking-btn').click();
  await expect(page.getByTestId('booking-confirmation')).toContainText('$105.00');

  await go(page, 'nav-bookings');
  const row = page.getByTestId('booking-row').filter({ hasText: /Prius/ });
  await expect(row).toContainText(/pending/i);
  await expect(row).toContainText('$105.00');
  await row.getByTestId('cancel-booking-btn').click();
  await expect(row.getByTestId('status-badge').first()).toContainText(/cancelled/i);

  await logout(page);
  await login(page, 'owner');
  const req = page.getByTestId('request-row').filter({ hasText: /Anu Dorj/ });
  await expect(req).toHaveCount(1);
  await expect(req).toContainText(/Prius/);
  await expect(req).toContainText(/cancelled/i);
});

test('F-12: Saved cars', async ({ page }) => {
  await page.goto('/');
  await login(page, 'renter');
  await go(page, 'nav-saved');
  await expect(page.getByTestId('saved-empty')).toBeVisible();

  await go(page, 'nav-browse');
  const civic = page.getByTestId('car-card').filter({ hasText: /Civic/ }).first();
  await civic.getByTestId('heart-btn').click();
  await expect(civic.getByTestId('heart-btn')).toHaveAttribute('aria-pressed', 'true');
  await go(page, 'nav-saved');
  await expect(page.getByTestId('car-card')).toHaveCount(1);
  await expect(page.getByTestId('car-card').first()).toContainText('Civic');

  await page.reload();
  if (await page.getByTestId('login-as-renter').isVisible()) {
    await page.getByTestId('login-as-renter').click();
  }
  await go(page, 'nav-saved');
  await expect(page.getByTestId('car-card')).toHaveCount(1);
  const saved = page.getByTestId('car-card').filter({ hasText: /Civic/ }).first();
  await saved.getByTestId('heart-btn').click();
  await expect(page.getByTestId('saved-empty')).toBeVisible();
});

test('F-13: Mobile layout has no horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await login(page, 'renter');
  await expect(page.getByTestId('car-card').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const boxes = await page.getByTestId('car-card').evaluateAll((els) => els.slice(0, 2).map((e) => e.getBoundingClientRect().top));
  expect(boxes[1]).toBeGreaterThan(boxes[0]);
});

const ENGLISH_WORDS = [
  'Automatic', 'Manual', 'Electric', 'Gasoline', 'Hybrid', 'Diesel',
  'Sedan', 'SUV', 'Hatchback', 'Coupe', 'Van',
  'Pending', 'Confirmed', 'Cancelled', 'Completed',
  'Owner', 'Renter', 'Airport Hub', 'Specific Address',
];

async function expectNoEnglish(page: Page) {
  for (const w of ENGLISH_WORDS) {
    await expect(page.getByText(w, { exact: true })).toHaveCount(0);
  }
}

test('I18N: Mongolian UI', async ({ page }) => {
  await page.goto('/');
  // Owner
  await login(page, 'owner');
  await page.getByTestId('lang-mn').first().click();
  await expect(page.getByTestId('stat-pending')).toBeVisible();
  await expectNoEnglish(page);
  await expect(page.getByText(/₮/).first()).toBeVisible();
  await expectLogoutInMongolian(page);
  await go(page, 'nav-fleet');
  await expect(page.getByTestId('fleet-row').first()).toBeVisible();
  await expectNoEnglish(page);
  await expect(page.getByText(/₮/).first()).toBeVisible();
  await logout(page);

  // Renter
  await login(page, 'renter');
  await page.getByTestId('lang-mn').first().click();
  await expect(page.getByTestId('car-card').first()).toBeVisible();
  await expectNoEnglish(page);
  await expect(page.getByText(/₮/).first()).toBeVisible();
  await expectLogoutInMongolian(page);

  await page.getByTestId('filter-max-rate').fill('324000');
  await expect(page.getByTestId('show-results-btn')).toContainText('5');
  await expect(page.getByTestId('car-card')).toHaveCount(5);
  await expect(page.getByTestId('car-card').filter({ hasText: /BMW/ })).toHaveCount(0);
  await expect(page.getByTestId('car-card').filter({ hasText: /Staria/ })).toHaveCount(0);
  await expect(page.getByTestId('car-card').filter({ hasText: /Land Cruiser/ })).toHaveCount(0);
  await page.getByTestId('filter-max-rate').fill('');

  await openCard(page, /Model 3/);
  await expectNoEnglish(page);
  await expect(page.getByText(/₮/).first()).toBeVisible();

  await go(page, 'nav-bookings');
  await expect(page.getByTestId('bookings-empty')).toBeVisible();
  await expectNoEnglish(page);

  await go(page, 'nav-saved');
  await expect(page.getByTestId('saved-empty')).toBeVisible();
  await expectNoEnglish(page);
});
