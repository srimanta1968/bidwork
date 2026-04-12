/**
 * Auth Routes - User Registration and Authentication
 * API Definitions:
 *   - tests/api_definitions/auth-register.json (POST /api/auth/register)
 *   - tests/api_definitions/auth-login.json (POST /api/auth/login)
 */
import { Router, Request, Response, RequestHandler } from 'express';
import { register, login } from '../controllers/authController';

interface AuthRoute {
  path: string;
  method: string;
  handler: RequestHandler;
}

const router: Router = Router();

const registerHandler: RequestHandler = (req: Request, res: Response): void => {
  register(req, res);
};

const loginHandler: RequestHandler = (req: Request, res: Response): void => {
  login(req, res);
};

router.post('/register', registerHandler);
router.post('/login', loginHandler);

export default router;
