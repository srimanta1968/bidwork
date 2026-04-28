import { biddingDb } from '../domainDb';

/**
 * Business-day arithmetic. Skips Saturdays, Sundays, and any date in
 * bidding.business_holidays for the configured country.
 *
 * Business hours are configured via BUSINESS_HOURS_PER_DAY (default 9). When
 * a deadline lands inside a non-business window we move forward to the next
 * working hour.
 */

const HOURS_PER_BUSINESS_DAY = parseInt(process.env.BUSINESS_HOURS_PER_DAY || '9', 10);
const COUNTRY_CODE = process.env.BUSINESS_HOLIDAYS_COUNTRY || 'US';

let holidayCache: Set<string> | null = null;
let holidayCacheLoadedAt = 0;

async function loadHolidays(): Promise<Set<string>> {
  // 5 minute TTL is plenty for a slowly-changing list.
  if (holidayCache && Date.now() - holidayCacheLoadedAt < 5 * 60 * 1000) return holidayCache;
  const rows = await biddingDb.queryAll<{ holiday_date: string }>(
    `SELECT holiday_date FROM business_holidays WHERE country_code = $1`, [COUNTRY_CODE]
  );
  holidayCache = new Set(rows.map(r => new Date(r.holiday_date).toISOString().slice(0, 10)));
  holidayCacheLoadedAt = Date.now();
  return holidayCache;
}

export async function isBusinessDay(date: Date): Promise<boolean> {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  const holidays = await loadHolidays();
  return !holidays.has(date.toISOString().slice(0, 10));
}

/**
 * Add `hours` business hours to `start`. We treat the calendar as a sequence
 * of "business days", each containing HOURS_PER_BUSINESS_DAY hours. Anything
 * that lands on a weekend or a holiday rolls forward to 09:00 of the next
 * business day.
 */
export async function addBusinessHours(start: Date, hours: number): Promise<Date> {
  let cursor = new Date(start.getTime());
  let remaining = hours;
  while (remaining > 0) {
    if (!(await isBusinessDay(cursor))) {
      // Roll to the next day's 09:00 UTC.
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(9, 0, 0, 0);
      continue;
    }
    const todayWindowEnd = new Date(cursor.getTime());
    todayWindowEnd.setUTCHours(9 + HOURS_PER_BUSINESS_DAY, 0, 0, 0);
    if (cursor.getUTCHours() < 9) {
      cursor.setUTCHours(9, 0, 0, 0);
    }
    if (cursor >= todayWindowEnd) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(9, 0, 0, 0);
      continue;
    }
    const hoursAvailableToday = (todayWindowEnd.getTime() - cursor.getTime()) / 3_600_000;
    if (remaining <= hoursAvailableToday) {
      cursor = new Date(cursor.getTime() + remaining * 3_600_000);
      remaining = 0;
    } else {
      remaining -= hoursAvailableToday;
      cursor = todayWindowEnd;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      cursor.setUTCHours(9, 0, 0, 0);
    }
  }
  return cursor;
}

export const businessDay = { isBusinessDay, addBusinessHours, HOURS_PER_BUSINESS_DAY, COUNTRY_CODE };
