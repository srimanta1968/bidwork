import { Router } from 'express';
import { stripeWebhook } from '../controllers/webhookController';

const router: Router = Router();

router.post('/stripe', stripeWebhook);

export default router;
