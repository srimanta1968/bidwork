import { Router, Request, Response, RequestHandler } from 'express';
import { register, login, verifyEmail, resendCode } from '../controllers/authController';

const router: Router = Router();

const wrap = (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req: Request, res: Response): void => { fn(req, res); };

router.post('/register', wrap(register));
router.post('/login', wrap(login));
router.post('/verify-email', wrap(verifyEmail));
router.post('/resend-code', wrap(resendCode));

export default router;
