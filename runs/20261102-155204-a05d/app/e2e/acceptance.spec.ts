import { test, expect, Page } from '@playwright/test';

// YYYY-MM-DD for today + n days (local time)
function day(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function loginOwner(page: Page) {
  await expect(page.getByTestId('login-screen')).toBeVisible();
  await page.getByTestId('login-as-owner').click();
  await expect(page.getByTestId('current-user').first()).toContainText('Bat-Erdene Ganbold');
}

async function loginRenter(page: Page) {
  await expect(page.getByTestId('login-screen')).toBeVisible();
  await page.getByTestId('login-as-renter').click();
  await expect(page.getByTestId('current-user').first()).toContainText('Anu Dorj');
}

async function logout(page: Page) {
  const menu = page.getByTestId('account-menu-btn').first();
  if ((await page.getByTestId('account-menu-btn').count()) > 0 && (await menu.isVisible())) {
    await menu.click();
  }
  await page.getByTestId('logout-btn').first().click();
  await expect(page.getByTestId('login-screen')).toBeVisible();
}

async function nav(page: Page, id: string) {
  await page.getByTestId(id).first().click();
}

async function readNumber(page: Page, id: string): Promise<number> {
  const txt = await page.getByTestId(id).first().innerText();
  return parseInt(txt.replace(/[^0-9]/g, ''), 10);
}

async function expectCars(page: Page, models: string[]) {
  const n = models.length;
  await expect(page.getByTestId('show-results-btn').first()).toContainText(new RegExp(`\\(\\s*${n} cars?\\s*\\)`, 'i'));
  await expect(page.getByTestId('car-card')).toHaveCount(n);
  for (const m of models) {
    await expect(page.getByTestId('car-card').filter({ hasText: m })).toHaveCount(1);
  }
}

async function openTesla(page: Page) {
  await page.getByTestId('filter-make').first().selectOption('Tesla');
  const card = page.getByTestId('car-card').filter({ hasText: 'Model 3' }).first();
  await expect(card).toBeVisible();
  await card.getByText('Model 3').first().click();
  await expect(page.getByTestId('car-details')).toBeVisible();
}

test('TR-1: Owner creates a listing with location and it appears immediately in the Renter catalog', async ({ page }) => {
  await page.goto('/');
  await loginOwner(page);
  await page.getByTestId('add-car-btn').first().click();
  await expect(page.getByTestId('car-form')).toBeVisible();
  await page.getByTestId('car-make').fill('Mazda');
  await page.getByTestId('car-model').fill('CX-5');
  await page.getByTestId('car-year').fill('2022');
  await page.getByTestId('car-fuel').selectOption('Gasoline');
  await page.getByTestId('car-transmission').selectOption('Automatic');
  await page.getByTestId('car-daily-rate').fill('75');
  await page.getByTestId('car-cleaning-fee').fill('20');
  await page.getByTestId('car-image-url').fill('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800');

  // Save with location empty -> error, nothing created
  await page.getByTestId('car-save-btn').click();
  await expect(page.getByTestId('location-error').first()).toContainText('Pickup/Drop-off location is required');
  await expect(page.getByTestId('car-form')).toBeVisible();

  await page.getByTestId('car-location-type').selectOption('City');
  await page.getByTestId('car-location-name').fill('Ulaanbaatar - Khan-Uul');
  await page.getByTestId('car-address').fill('Khan-Uul District, Ulaanbaatar, Mongolia');
  await page.getByTestId('car-save-btn').click();
  await expect(page.getByTestId('car-form')).toHaveCount(0);

  await nav(page, 'nav-fleet');
  const row = page.getByTestId('fleet-row').filter({ hasText: 'Mazda' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('CX-5');
  await expect(page.getByTestId('fleet-row')).toHaveCount(7);

  await logout(page);
  await loginRenter(page);

  const first = page.getByTestId('car-card').first();
  await expect(first).toContainText('Mazda');
  await expect(first).toContainText('CX-5');
  await expect(first).toContainText('2022');
  await expect(first.getByTestId('car-price')).toContainText('$75.00/day');
  await expect(first).toContainText('Gasoline');
  await expect(first).toContainText('Automatic');
  await expect(first.locator('img').first()).toBeVisible();
  await expect(first.getByTestId('car-location-badge')).toContainText('Ulaanbaatar - Khan-Uul');
  await expect(page.getByTestId('car-card').filter({ hasText: 'Mazda' })).toHaveCount(1);

  await first.getByText('CX-5').first().click();
  await expect(page.getByTestId('car-details')).toBeVisible();
  await expect(page.getByTestId('detail-cleaning-fee').first()).toContainText('$20.00');
  await expect(page.getByTestId('detail-address').first()).toContainText('Khan-Uul District, Ulaanbaatar, Mongolia');
});

test('TR-2: Each filter removes non-matching cars in real time', async ({ page }) => {
  await page.goto('/');
  await loginRenter(page);
  const make = page.getByTestId('filter-make').first();
  const loc = page.getByTestId('filter-location').first();
  const rate = page.getByTestId('filter-max-rate').first();
  const trans = page.getByTestId('filter-transmission').first();

  await expect(page.getByTestId('show-results-btn').first()).toContainText(/\(\s*8 cars\s*\)/i);

  await make.selectOption('Toyota');
  await expectCars(page, ['Prius', 'Land Cruiser']);
  await make.selectOption({ index: 0 });
  await expect(page.getByTestId('show-results-btn').first()).toContainText(/\(\s*8 cars\s*\)/i);

  await loc.fill('ulaanbaatar');
  await expectCars(page, ['Prius', 'Ranger', 'Kona Electric']);
  await loc.fill('');
  await expect(page.getByTestId('show-results-btn').first()).toContainText(/\(\s*8 cars\s*\)/i);

  await rate.fill('60');
  await expectCars(page, ['Prius', 'Civic', 'Kona Electric']);
  await rate.fill('');
  await expect(page.getByTestId('show-results-btn').first()).toContainText(/\(\s*8 cars\s*\)/i);

  await trans.selectOption('Manual');
  await expectCars(page, ['Ranger', 'BMW', 'Civic']);
  await trans.selectOption({ index: 0 });
  await expect(page.getByTestId('show-results-btn').first()).toContainText(/\(\s*8 cars\s*\)/i);

  await make.selectOption('Hyundai');
  await trans.selectOption('Automatic');
  await rate.fill('70');
  await expectCars(page, ['Kona Electric']);
});

test('TR-3: Booking price calculation: Days x Daily Rate + Cleaning Fee', async ({ page }) => {
  await page.goto('/');
  await loginRenter(page);
  await openTesla(page);

  await page.getByTestId('pickup-date').fill(day(10));
  await page.getByTestId('return-date').fill(day(13));
  await expect(page.getByTestId('summary-days')).toContainText('3');
  await expect(page.getByTestId('summary-rate')).toContainText('$85.00');
  await expect(page.getByTestId('summary-cleaning-fee')).toContainText('$25.00');
  await expect(page.getByTestId('summary-total')).toContainText('$280.00');

  await page.getByTestId('return-time').selectOption('16:30');
  await expect(page.getByTestId('summary-days')).toContainText('3');
  await expect(page.getByTestId('summary-total')).toContainText('$280.00');

  await page.getByTestId('return-date').fill(day(10));
  await expect(page.getByTestId('date-error')).toContainText('Return must be after pickup');
  await expect(page.getByTestId('request-booking-btn')).toBeDisabled();
});

test('TR-4: Renter request appears in owner queue; owner clicks Approve and the status shows Confirmed in both views', async ({ page }) => {
  await page.goto('/');
  await loginRenter(page);
  await openTesla(page);
  await page.getByTestId('pickup-date').fill(day(10));
  await page.getByTestId('return-date').fill(day(13));
  await expect(page.getByTestId('summary-total')).toContainText('$280.00');
  await page.getByTestId('request-booking-btn').click();
  await expect(page.getByTestId('booking-confirmation')).toContainText('$280.00');

  await nav(page, 'nav-bookings');
  const myRow = page.getByTestId('booking-row').filter({ hasText: 'Model 3' });
  await expect(myRow).toHaveCount(1);
  await expect(myRow.getByTestId('status-badge')).toContainText(/pending/i);
  await expect(myRow).toContainText('$280.00');

  await logout(page);
  await loginOwner(page);
  await nav(page, 'nav-dashboard');
  await expect(page.getByTestId('stat-active').first()).toBeVisible();
  const activeBefore = await readNumber(page, 'stat-active');

  const row = page.getByTestId('request-row').filter({ hasText: 'Anu Dorj' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Model 3');
  await expect(row.getByTestId('status-badge')).toContainText(/pending/i);
  await expect(row).toContainText('$280.00');
  await row.getByTestId('approve-btn').click();
  await expect(row.getByTestId('status-badge')).toContainText(/confirmed/i);
  await expect(row.getByTestId('approve-btn')).toHaveCount(0);
  await expect(row.getByTestId('decline-btn')).toHaveCount(0);
  await expect.poll(() => readNumber(page, 'stat-active')).toBe(activeBefore + 1);

  await logout(page);
  await loginRenter(page);
  await nav(page, 'nav-bookings');
  const after = page.getByTestId('booking-row').filter({ hasText: 'Model 3' });
  await expect(after).toHaveCount(1);
  await expect(after.getByTestId('status-badge')).toContainText(/confirmed/i);
});

test('TR-5: Owner clicks Decline and the status shows Cancelled in both views', async ({ page }) => {
  await page.goto('/');
  await loginOwner(page);
  await nav(page, 'nav-dashboard');
  await expect(page.getByTestId('stat-pending').first()).toBeVisible();
  const pendingBefore = await readNumber(page, 'stat-pending');

  const row = page.getByTestId('request-row').filter({ hasText: 'Oyunaa Bold' }).filter({ hasText: 'Land Cruiser' });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('$275.00');
  await expect(row.getByTestId('status-badge')).toContainText(/pending/i);
  await row.getByTestId('decline-btn').click();
  await expect(row.getByTestId('status-badge')).toContainText(/cancelled/i);
  await expect(row.getByTestId('approve-btn')).toHaveCount(0);
  await expect(row.getByTestId('decline-btn')).toHaveCount(0);
  await expect.poll(() => readNumber(page, 'stat-pending')).toBe(pendingBefore - 1);

  await page.getByTestId('status-filter').first().selectOption('Cancelled');
  const cancelledRow = page.getByTestId('request-row').filter({ hasText: 'Oyunaa Bold' }).filter({ hasText: 'Land Cruiser' });
  await expect(cancelledRow).toHaveCount(1);
  await expect(cancelledRow.getByTestId('status-badge')).toContainText(/cancelled/i);
  await expect(page.getByTestId('request-row').filter({ hasText: /pending/i })).toHaveCount(0);
});

test('TR-6: Owner dashboard overview, pagination and persistence on seed data', async ({ page }) => {
  await page.goto('/');
  await loginOwner(page);
  await nav(page, 'nav-dashboard');
  await expect(page.getByTestId('stat-pending').first()).toContainText('2');
  await expect(page.getByTestId('stat-active').first()).toContainText('1');
  await expect(page.getByTestId('stat-cars').first()).toContainText('6');
  await expect(page.getByTestId('stat-earnings').first()).toContainText('$750.00');

  await logout(page);
  await loginRenter(page);
  await expect(page.getByTestId('car-card')).toHaveCount(6);
  await page.getByTestId('page-next').first().click();
  await expect(page.getByTestId('car-card')).toHaveCount(2);
  await page.getByTestId('page-prev').first().click();
  await expect(page.getByTestId('car-card')).toHaveCount(6);

  await page.reload();
  if (await page.getByTestId('login-screen').isVisible()) {
    await loginRenter(page);
  }
  await expect(page.getByTestId('show-results-btn').first()).toContainText(/\(\s*8 cars\s*\)/i);
  await expect(page.getByTestId('car-card')).toHaveCount(6);
  await nav(page, 'nav-bookings');
  await expect(page.getByTestId('bookings-empty')).toBeVisible();
  await expect(page.getByTestId('booking-row')).toHaveCount(0);

  await logout(page);
  await loginOwner(page);
  await page.reload();
  if (await page.getByTestId('login-screen').isVisible()) {
    await loginOwner(page);
  }
  await nav(page, 'nav-dashboard');
  await expect(page.getByTestId('stat-pending').first()).toContainText('2');
  await expect(page.getByTestId('stat-active').first()).toContainText('1');
  await expect(page.getByTestId('stat-cars').first()).toContainText('6');
  await expect(page.getByTestId('stat-earnings').first()).toContainText('$750.00');
  await expect(page.getByTestId('request-row').filter({ hasText: /pending/i })).toHaveCount(2);
});

test('QA: no broken values', async ({ page }) => {
  const broken = /undefined|NaN|null|\[object Object\]/;
  await page.goto('/');
  await loginOwner(page);
  await nav(page, 'nav-dashboard');
  await expect(page.getByTestId('stat-pending').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(broken);
  await nav(page, 'nav-fleet');
  await expect(page.getByTestId('fleet-row').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(broken);
  await logout(page);

  await loginRenter(page);
  await expect(page.getByTestId('car-card').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(broken);
  await openTesla(page);
  await expect(page.locator('body')).not.toContainText(broken);
  await nav(page, 'nav-bookings');
  await expect(page.getByTestId('bookings-empty')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(broken);
  await nav(page, 'nav-saved');
  await expect(page.locator('body')).not.toContainText(broken);
});
