import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { AuthenticatedRequest } from '../types';
import { adminLogin, getUsers, getUserStats, getUserById, updateUserStatus, getBidPriceRules, createBidPriceRule, updateBidPriceRule, deleteBidPriceRule, getPriceVarianceAnalytics, getSubscriptions, getSubscriptionStats, updateSubscription, getSubscriptionPlans, createSubscriptionPlan, getPlatformUsage, getContractAllocation } from '../controllers/adminController';

const router: Router = Router();
const wrap = (fn: Function) => (req: Request, res: Response) => fn(req as AuthenticatedRequest, res);

// Admin login (no auth required - this IS the auth endpoint)
router.post('/auth/login', adminLogin as any);

// All subsequent admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

// User management
router.get('/users', wrap(getUsers));
router.get('/users/stats', wrap(getUserStats));
router.get('/users/:id', wrap(getUserById));
router.put('/users/:id/status', wrap(updateUserStatus));

// Bid price rules
router.get('/rules/bid-price', wrap(getBidPriceRules));
router.post('/rules/bid-price', wrap(createBidPriceRule));
router.put('/rules/bid-price/:id', wrap(updateBidPriceRule));
router.delete('/rules/bid-price/:id', wrap(deleteBidPriceRule));

// Subscriptions
router.get('/subscriptions', wrap(getSubscriptions));
router.get('/subscriptions/stats', wrap(getSubscriptionStats));
router.put('/subscriptions/:id', wrap(updateSubscription));
router.get('/subscription-plans', wrap(getSubscriptionPlans));
router.post('/subscription-plans', wrap(createSubscriptionPlan));

// Analytics
router.get('/analytics/price-variance', wrap(getPriceVarianceAnalytics));
router.get('/analytics/platform-usage', wrap(getPlatformUsage));
router.get('/analytics/contract-allocation', wrap(getContractAllocation));

export default router;
