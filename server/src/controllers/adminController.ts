import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../types';
import { adminService } from '../services/adminService';
import { authService } from '../services/authService';

export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ success: false, error: 'Email and password required' }); return; }

    const user = await authService.findUserByEmail(email);
    if (!user) { res.status(401).json({ success: false, error: 'Invalid credentials' }); return; }

    if (user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access only' }); return;
    }

    const isValidPassword = await authService.comparePassword(password, user.password_hash);
    if (!isValidPassword) { res.status(401).json({ success: false, error: 'Invalid credentials' }); return; }

    const token = authService.generateToken({ userId: user.id, email: user.email, role: user.role });
    res.status(200).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role } }
    });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await adminService.getUsers({ role, status, search, page, limit });
    res.status(200).json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const stats = await adminService.getUserStats();
    res.status(200).json({ success: true, data: { stats } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    res.status(200).json({ success: true, data: { user } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { is_active } = req.body;
    if (is_active === undefined) { res.status(400).json({ success: false, error: 'is_active is required' }); return; }
    const user = await adminService.updateUserStatus(req.params.id, is_active);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    res.status(200).json({ success: true, data: { user } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getBidPriceRules(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rules = await adminService.getBidPriceRules();
    res.status(200).json({ success: true, data: { rules } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function createBidPriceRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { job_category, min_price_percentage } = req.body;
    if (!min_price_percentage || min_price_percentage < 1 || min_price_percentage > 100) {
      res.status(400).json({ success: false, error: 'min_price_percentage must be between 1 and 100' }); return;
    }
    const rule = await adminService.createBidPriceRule({ job_category, min_price_percentage, created_by: req.user.userId });
    res.status(201).json({ success: true, data: { rule } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function updateBidPriceRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { min_price_percentage } = req.body;
    if (!min_price_percentage || min_price_percentage < 1 || min_price_percentage > 100) {
      res.status(400).json({ success: false, error: 'min_price_percentage must be between 1 and 100' }); return;
    }
    const rule = await adminService.updateBidPriceRule(req.params.id, { min_price_percentage });
    if (!rule) { res.status(404).json({ success: false, error: 'Rule not found' }); return; }
    res.status(200).json({ success: true, data: { rule } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function deleteBidPriceRule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rule = await adminService.deleteBidPriceRule(req.params.id);
    if (!rule) { res.status(400).json({ success: false, error: 'Cannot delete global default rule or rule not found' }); return; }
    res.status(200).json({ success: true, data: { deleted: true } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getPriceVarianceAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const category = req.query.category as string | undefined;
    const analytics = await adminService.getPriceVarianceAnalytics({ from, to, category });
    res.status(200).json({ success: true, data: { analytics } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getSubscriptions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const plan = req.query.plan as string | undefined;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const subscriptions = await adminService.getSubscriptions({ plan, status, page, limit });
    res.status(200).json({ success: true, data: { subscriptions } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getSubscriptionStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const stats = await adminService.getSubscriptionStats();
    res.status(200).json({ success: true, data: { stats } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function updateSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await adminService.updateSubscription(req.params.id, req.body);
    if (!result) { res.status(404).json({ success: false, error: 'Subscription not found' }); return; }
    res.status(200).json({ success: true, data: { subscription: result } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getSubscriptionPlans(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const plans = await adminService.getSubscriptionPlans();
    res.status(200).json({ success: true, data: { plans } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function createSubscriptionPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, price, features, billing_cycle } = req.body;
    if (!name || !price || !billing_cycle) { res.status(400).json({ success: false, error: 'name, price, and billing_cycle required' }); return; }
    const plan = await adminService.createSubscriptionPlan({ name, price, features: features || [], billing_cycle });
    res.status(201).json({ success: true, data: { plan } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getPlatformUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const usage = await adminService.getPlatformUsageAnalytics();
    res.status(200).json({ success: true, data: { usage } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getContractAllocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const allocation = await adminService.getContractAllocationAnalytics();
    res.status(200).json({ success: true, data: { allocation } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

// ── Platform Service Fee ──

export async function getCurrentServiceFee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const current = await adminService.getCurrentServiceFee();
    res.status(200).json({ success: true, data: { current } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function getServiceFeeHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await adminService.getServiceFeeHistory(limit);
    res.status(200).json({ success: true, data: { history } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
}

export async function setServiceFee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false, error: 'Authentication required' }); return; }
    const { percent, effective_from, notes } = req.body;
    if (typeof percent !== 'number') { res.status(400).json({ success: false, error: 'percent (decimal between 0 and 0.5) is required' }); return; }
    const config = await adminService.setServiceFee({ percent, effective_from, notes, set_by_admin_id: req.user.userId });
    res.status(201).json({ success: true, data: { config } });
  } catch (error: any) { res.status(400).json({ success: false, error: error.message }); }
}

/**
 * Aggregated KPI summary for the admin Dashboard. Bundles a few existing
 * service calls so the UI can render the landing page in one round-trip.
 */
export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const [usersByRole, subStats, currentFee] = await Promise.all([
      adminService.getUserStats().catch(() => ({})),
      adminService.getSubscriptionStats().catch(() => ({})),
      adminService.getCurrentServiceFee().catch(() => null),
    ]);
    res.status(200).json({
      success: true,
      data: {
        users: usersByRole,
        subscriptions: subStats,
        service_fee: currentFee,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
