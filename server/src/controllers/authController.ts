import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { emailService } from '../services/emailService';
import { validatePassword } from '../validators/passwordValidator';
import { validateEmail } from '../validators/emailValidator';
import { isRateLimited, recordFailedAttempt, clearRateLimit } from '../middleware/rateLimiter';
import { VALID_ROLES } from '../types';

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      res.status(400).json({ success: false, error: 'First name, last name, email, password, and role are required' });
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      res.status(400).json({ success: false, error: emailValidation.error });
      return;
    }

    if (!VALID_ROLES.includes(role)) {
      res.status(400).json({ success: false, error: 'Role must be homeowner, contractor, or skilled_labor' });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({ success: false, error: passwordValidation.errors[0] });
      return;
    }

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const user = await authService.createUser(first_name, last_name, email, password, role);

    // Generate and send verification code
    const code = emailService.generateVerificationCode();
    await authService.storeVerificationCode(user.id, code);
    await emailService.sendVerificationEmail(email, code, first_name);

    const token = authService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          is_onboarded: user.is_onboarded,
          is_email_verified: false,
        },
        token,
        requiresVerification: true,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const clientIp: string = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({ success: false, error: 'Too many login attempts. Please try again later.' });
      return;
    }

    const result = await authService.authenticateUser(email, password);

    if (!result) {
      recordFailedAttempt(clientIp);
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    clearRateLimit(clientIp);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/verify-email
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ success: false, error: 'Email and verification code are required' });
      return;
    }

    const verified = await authService.verifyEmailCode(email, code);

    if (!verified) {
      res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
      return;
    }

    res.status(200).json({ success: true, data: { verified: true } });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/resend-code
 */
export async function resendCode(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    const user = await authService.getUnverifiedUser(email);
    if (!user) {
      res.status(400).json({ success: false, error: 'No pending verification for this email' });
      return;
    }

    const code = emailService.generateVerificationCode();
    await authService.storeVerificationCode(user.id, code);
    await emailService.sendVerificationEmail(email, code, user.first_name);

    res.status(200).json({ success: true, data: { sent: true } });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── OAuth (Google + LinkedIn) ──

const OAUTH_PROVIDERS = ['google', 'linkedin'] as const;
type OAuthProvider = typeof OAUTH_PROVIDERS[number];

function clientCallbackBase(): string {
  return (process.env.OAUTH_CLIENT_BASE || 'http://localhost:5173').replace(/\/$/, '');
}

function apiBase(req: Request): string {
  // Prefer the explicit env value (works behind proxies); else derive from the request.
  return process.env.OAUTH_REDIRECT_BASE || `${req.protocol}://${req.get('host')}`;
}

/**
 * GET /api/auth/oauth/:provider/start?intent=signup|login&role=homeowner|contractor|skilled_labor
 * 302 redirect to the provider's authorize URL with a signed state.
 */
export async function oauthStart(req: Request, res: Response): Promise<void> {
  try {
    const provider = String(req.params.provider) as OAuthProvider;
    if (!OAUTH_PROVIDERS.includes(provider)) {
      res.status(400).json({ success: false, error: 'Unsupported OAuth provider' }); return;
    }
    const intent = (req.query.intent === 'login' ? 'login' : 'signup') as 'signup' | 'login';
    const roleParam = req.query.role ? String(req.query.role) : undefined;
    if (intent === 'signup') {
      if (!roleParam || !VALID_ROLES.includes(roleParam as any)) {
        res.status(400).json({ success: false, error: 'role is required for signup and must be homeowner, contractor, or skilled_labor' });
        return;
      }
    }
    const { oauthService } = await import('../services/oauthService');
    const url = oauthService.buildAuthorizeUrl(provider, roleParam as any, intent, apiBase(req));
    res.redirect(302, url);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/auth/oauth/:provider/callback?code=...&state=...
 * Verifies state, exchanges code, fetches profile, creates/links user,
 * then 302s to the client app with ?token=&role=, or ?error= on failure.
 */
export async function oauthCallback(req: Request, res: Response): Promise<void> {
  const clientBase = clientCallbackBase();
  try {
    const provider = String(req.params.provider) as OAuthProvider;
    if (!OAUTH_PROVIDERS.includes(provider)) {
      res.redirect(302, `${clientBase}/oauth/callback?error=${encodeURIComponent('unsupported_provider')}`); return;
    }
    if (req.query.error) {
      res.redirect(302, `${clientBase}/oauth/callback?error=${encodeURIComponent(String(req.query.error))}`); return;
    }
    const code = req.query.code ? String(req.query.code) : '';
    const state = req.query.state ? String(req.query.state) : '';
    if (!code || !state) {
      res.redirect(302, `${clientBase}/oauth/callback?error=${encodeURIComponent('missing_code_or_state')}`); return;
    }

    const { oauthService } = await import('../services/oauthService');
    const payload = oauthService.verifyState(state);
    const { accessToken } = await oauthService.exchangeCode(provider, code, apiBase(req));
    const profile = await oauthService.fetchProfile(provider, accessToken);

    const result = await authService.findOrCreateFromOAuth({
      provider,
      profile,
      role: payload.role as any,
      intent: payload.intent,
    });

    // Encode the full user payload so the callback page can hydrate the
    // AuthContext without an extra round-trip.
    const userJson = Buffer.from(JSON.stringify(result.user), 'utf8').toString('base64url');
    const params = new URLSearchParams({
      token: result.token,
      user: userJson,
    });
    res.redirect(302, `${clientBase}/oauth/callback?${params.toString()}`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(302, `${clientBase}/oauth/callback?error=${encodeURIComponent(error.message || 'oauth_failed')}`);
  }
}
