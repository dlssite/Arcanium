import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import { AuthProvider } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js';
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } from '../lib/cookies.js';
import { ensureDefaultShelves } from '../lib/shelves.js';
import { RegisterSchema, LoginSchema } from '@arcanium/types';

// ---------------------------------------------------------------------------
// Google OAuth client (lazy — only instantiated when GOOGLE_CLIENT_ID is set)
// ---------------------------------------------------------------------------

function getOAuthClient(): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID in .env');
  }
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function issueTokens(res: Response, userId: string, role = 'USER'): string {
  const accessToken = signAccessToken(userId, role);
  const refreshToken = signRefreshToken(userId);
  setRefreshCookie(res, refreshToken);
  return accessToken;
}

// ---------------------------------------------------------------------------
// Google OAuth — Step 1: redirect to consent screen
// ---------------------------------------------------------------------------

export function googleRedirect(_req: Request, res: Response): void {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent',
  });
  res.redirect(url);
}

// ---------------------------------------------------------------------------
// Google OAuth — Step 2: exchange code, upsert user, issue JWT
// ---------------------------------------------------------------------------

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const { code } = req.query as { code?: string };

  if (!code) {
    res.status(400).json({
      data: null,
      error: { code: 'MISSING_CODE', message: 'No auth code received from Google' },
    });
    return;
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      res.status(401).json({
        data: null,
        error: { code: 'INVALID_TOKEN', message: 'Invalid Google ID token' },
      });
      return;
    }

    // Upsert the User record
    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        displayName: payload.name ?? payload.email,
        avatarUrl: payload.picture ?? null,
      },
      create: {
        email: payload.email,
        displayName: payload.name ?? payload.email,
        avatarUrl: payload.picture ?? null,
      },
      select: { id: true, role: true },
    });

    // Upsert the Google AuthAccount
    await prisma.authAccount.upsert({
      where: { providerId: payload.sub },
      update: {},
      create: {
        userId: user.id,
        provider: AuthProvider.GOOGLE,
        providerId: payload.sub,
      },
    });

    await ensureDefaultShelves(user.id);

    const accessToken = issueTokens(res, user.id, user.role);

    // Redirect the SPA — token in fragment (never sent to server)
    const webBase = env.CORS_ORIGINS[0] ?? 'http://localhost:3000';
    res.redirect(`${webBase}/auth/callback#token=${accessToken}`);
  } catch (err) {
    console.error('[auth] Google callback error:', err);
    res.status(500).json({
      data: null,
      error: { code: 'AUTH_FAILED', message: 'Google authentication failed' },
    });
  }
}

// ---------------------------------------------------------------------------
// Email/Password — Register
// ---------------------------------------------------------------------------

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues.map((i: { message: string }) => i.message).join('; '),
      },
    });
    return;
  }

  const { email, password, displayName } = parsed.data;

  // Check for existing email account
  const existingAccount = await prisma.authAccount.findFirst({
    where: {
      provider: AuthProvider.EMAIL,
      user: { email },
    },
  });

  if (existingAccount) {
    res.status(409).json({
      data: null,
      error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists' },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    // If they already have a Google account, add email auth to it
    update: {},
    create: { email, displayName },
    select: { id: true, role: true },
  });

  await prisma.authAccount.create({
    data: {
      userId: user.id,
      provider: AuthProvider.EMAIL,
      password: passwordHash,
    },
  });

  await ensureDefaultShelves(user.id);

  const accessToken = issueTokens(res, user.id, user.role);
  res.status(201).json({ data: { accessToken }, error: null });
}

// ---------------------------------------------------------------------------
// Email/Password — Login
// ---------------------------------------------------------------------------

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid email or password format' },
    });
    return;
  }

  const { email, password } = parsed.data;

  const account = await prisma.authAccount.findFirst({
    where: {
      provider: AuthProvider.EMAIL,
      user: { email },
    },
    include: { user: { select: { id: true, role: true, email: true } } },
  });

  // Constant-time comparison — don't leak whether email exists
  const dummyHash = '$2a$12$invalidhashfortimingnormalisation00000000000000000000000';
  const storedHash = account?.password ?? dummyHash;
  const valid = await bcrypt.compare(password, storedHash);

  if (!account || !valid) {
    res.status(401).json({
      data: null,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
    return;
  }

  const accessToken = issueTokens(res, account.user.id, account.user.role);
  res.json({ data: { accessToken }, error: null });
}

// ---------------------------------------------------------------------------
// Refresh — exchange httpOnly cookie for new access token
// ---------------------------------------------------------------------------

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies[REFRESH_COOKIE] as string | undefined;

  if (!token) {
    res.status(401).json({
      data: null,
      error: { code: 'NO_REFRESH_TOKEN', message: 'Not authenticated' },
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    if (payload.type !== 'refresh') throw new Error('Wrong token type');

    // Look up the current role from the DB — role may have changed since the
    // refresh token was issued (e.g. admin approved a creator application).
    const user = await prisma.user.findUnique({
      where:  { id: payload.sub },
      select: { id: true, role: true },
    });

    if (!user) {
      clearRefreshCookie(res);
      res.status(401).json({
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'Account no longer exists' },
      });
      return;
    }

    const accessToken = signAccessToken(user.id, user.role);
    res.json({ data: { accessToken }, error: null });
  } catch {
    clearRefreshCookie(res);
    res.status(401).json({
      data: null,
      error: { code: 'INVALID_REFRESH_TOKEN', message: 'Session expired — please sign in again' },
    });
  }
}

// ---------------------------------------------------------------------------
// Logout — clear the refresh cookie
// ---------------------------------------------------------------------------

export function logout(_req: Request, res: Response): void {
  clearRefreshCookie(res);
  res.json({ data: { message: 'Logged out successfully' }, error: null });
}
