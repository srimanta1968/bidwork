import { addBusinessHours, isBusinessDay } from '../../src/services/workflow/businessDay';

// Lightweight tests that don't hit the DB — they exercise the calendar logic only.
// The holiday set is loaded lazily and would normally call the DB; for these tests
// we mock by stubbing globalThis.fetch and relying on the cache being empty.

jest.mock('../../src/services/domainDb', () => ({
  biddingDb: { queryAll: jest.fn().mockResolvedValue([]) },
}));

describe('businessDay', () => {
  it('treats Saturday as non-business', async () => {
    const sat = new Date('2026-04-25T15:00:00Z');
    expect(await isBusinessDay(sat)).toBe(false);
  });

  it('treats Wednesday as business', async () => {
    const wed = new Date('2026-04-29T15:00:00Z');
    expect(await isBusinessDay(wed)).toBe(true);
  });

  it('addBusinessHours skips weekends', async () => {
    // Friday 16:00 UTC + 6 business hours should land Monday around 15:00 UTC,
    // because the 9-hour window runs 09:00-18:00 UTC.
    const fri = new Date('2026-04-24T16:00:00Z');
    const out = await addBusinessHours(fri, 6);
    // Should not land on a weekend.
    expect(out.getUTCDay()).not.toBe(0);
    expect(out.getUTCDay()).not.toBe(6);
    expect(out.getTime()).toBeGreaterThan(fri.getTime());
  });
});
