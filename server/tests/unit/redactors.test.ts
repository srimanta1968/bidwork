import {
  shouldRevealAddress,
  maskAddress,
  redactProjectForContractor,
  redactHomeownerForContractor,
  redactContractorForOwner,
  redactBidForViewer,
} from '../../src/services/redactors';

describe('redactors', () => {
  describe('shouldRevealAddress', () => {
    it('reveals when bid status is accepted', () => {
      expect(shouldRevealAddress('accepted', 'pending')).toBe(true);
    });

    it('reveals when workflow is post-execution', () => {
      expect(shouldRevealAddress(undefined, 'addresses_revealed')).toBe(true);
      expect(shouldRevealAddress(undefined, 'in_progress')).toBe(true);
      expect(shouldRevealAddress(undefined, 'payment_received')).toBe(true);
    });

    it('hides while bid is still pending or shortlisted', () => {
      expect(shouldRevealAddress('pending', 'pending')).toBe(false);
      expect(shouldRevealAddress('pending', 'shortlisted')).toBe(false);
      expect(shouldRevealAddress('pending', 'approved_by_owner')).toBe(false);
    });
  });

  describe('maskAddress', () => {
    it('drops the leading street line', () => {
      expect(maskAddress('123 Main St, Springfield, IL 62701')).toBe('Springfield, IL 62701');
    });
    it('returns empty string for null', () => {
      expect(maskAddress(null)).toBe('');
    });
    it('returns single-segment input unchanged', () => {
      expect(maskAddress('Springfield')).toBe('Springfield');
    });
  });

  describe('redactProjectForContractor', () => {
    const project = {
      id: 'p1', title: 'Bath remodel',
      location_address: '123 Main St, Austin, TX 78701',
      city: 'Austin', zip_code: '78701',
      homeowner_email: 'owner@example.com',
      homeowner_phone: '555-0100',
    };

    it('masks address and strips email/phone for non-winners', () => {
      const out = redactProjectForContractor(project as any, { bidStatus: 'pending', workflowState: 'pending' });
      expect(out.location_address).toBe('Austin, TX 78701');
      expect((out as any).homeowner_email).toBeUndefined();
      expect((out as any).homeowner_phone).toBeUndefined();
    });

    it('returns full project once bid is accepted', () => {
      const out = redactProjectForContractor(project as any, { bidStatus: 'accepted' });
      expect(out.location_address).toBe('123 Main St, Austin, TX 78701');
    });
  });

  describe('redactContractorForOwner', () => {
    const contractor = {
      id: 'c1', user_id: 'u1', business_name: 'Acme', license_number: 'TX-123',
      category: 'plumbing', city: 'Austin', state: 'TX',
      email: 'c@example.com', phone: '555-0200', billing_phone: '555-0201',
      office_address: '500 Trade St', billing_address_line1: '500 Trade St',
    };

    it('keeps public fields and strips contact info pre-acceptance', () => {
      const out = redactContractorForOwner(contractor as any, { bidStatus: 'pending' });
      expect(out.business_name).toBe('Acme');
      expect(out.license_number).toBe('TX-123');
      expect((out as any).email).toBeUndefined();
      expect((out as any).phone).toBeUndefined();
      expect((out as any).billing_phone).toBeUndefined();
      expect((out as any).office_address).toBeUndefined();
      expect((out as any).billing_address_line1).toBeUndefined();
    });

    it('returns full record once bid is accepted', () => {
      const out = redactContractorForOwner(contractor as any, { bidStatus: 'accepted' });
      expect(out.email).toBe('c@example.com');
      expect(out.office_address).toBe('500 Trade St');
    });
  });

  describe('redactHomeownerForContractor', () => {
    const homeowner = {
      id: 'h1', first_name: 'Jane', last_name: 'Doe', role: 'homeowner', created_at: '2024-01-01',
      email: 'jane@example.com', phone: '555-0300',
    };

    it('keeps id/name/role and strips email/phone pre-acceptance', () => {
      const out = redactHomeownerForContractor(homeowner as any, { bidStatus: 'pending' });
      expect(out.first_name).toBe('Jane');
      expect((out as any).email).toBeUndefined();
      expect((out as any).phone).toBeUndefined();
    });
  });

  describe('redactBidForViewer', () => {
    it('strips any joined PII columns defensively', () => {
      const out = redactBidForViewer({
        id: 'b1', bid_amount: 1000,
        contractor_email: 'leak@x.com', contractor_phone: 'leak',
        homeowner_email: 'leak@y.com', homeowner_phone: 'leak',
      });
      expect(out.id).toBe('b1');
      expect((out as any).contractor_email).toBeUndefined();
      expect((out as any).contractor_phone).toBeUndefined();
      expect((out as any).homeowner_email).toBeUndefined();
      expect((out as any).homeowner_phone).toBeUndefined();
    });
  });
});
