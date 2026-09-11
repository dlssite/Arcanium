import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';
import arcaniumLogo from '../../arcanium.png';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAdminAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validate = (): boolean => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    await login(email, password);

    // Read the store state directly after the async call resolves.
    if (useAdminAuthStore.getState().isAuthenticated) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0712] flex items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden border border-purple-500/30 mb-4 shadow-[0_8px_32px_rgba(139,92,246,0.25)]">
            <img src={arcaniumLogo} alt="Arcanium logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-xl font-semibold text-[#F3EFFC] tracking-tight">
            Arcanium Admin
          </h1>
          <p className="text-sm text-[#6D6282] mt-1">
            Sign in with your admin credentials
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* API-level error banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 px-3.5 py-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          {/* Email */}
          <Input
            id="email"
            type="email"
            placeholder="admin@arcanium.app"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            icon={<Mail className="w-4 h-4" />}
            error={fieldErrors.email}
            autoComplete="email"
            autoFocus
            disabled={isLoading}
          />

          {/* Password */}
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            icon={<Lock className="w-4 h-4" />}
            error={fieldErrors.password}
            autoComplete="current-password"
            disabled={isLoading}
          />

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-[#4A4360] mt-6">
          Access restricted to authorised personnel only
        </p>
      </div>
    </div>
  );
};
