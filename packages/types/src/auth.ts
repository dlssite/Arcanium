import { z } from 'zod';

// ---------------------------------------------------------------------------
// Email / Password auth
// ---------------------------------------------------------------------------

export const RegisterSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .max(72, { message: 'Password must be at most 72 characters' }),
  displayName: z.string().min(1).max(100),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ---------------------------------------------------------------------------
// Token response — returned by /register, /login, and /refresh
// The refresh token is NOT in this payload; it rides in the httpOnly cookie.
// ---------------------------------------------------------------------------

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
});

export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

// ---------------------------------------------------------------------------
// JWT payload shape (internal — used by backend only, exported for sharing)
// ---------------------------------------------------------------------------

export const JwtPayloadSchema = z.object({
  sub: z.string().cuid(), // User.id
  type: z.enum(['access', 'refresh']).optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
