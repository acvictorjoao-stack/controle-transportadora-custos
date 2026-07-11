'use client';

import {AlertCircle, Eye, EyeOff} from 'lucide-react';
import Link from 'next/link';
import {isRedirectError} from 'next/dist/client/components/redirect-error';
import {useSearchParams} from 'next/navigation';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ROUTES} from '@/constants/routes/paths';
import {useAuth} from '@/contexts/auth/use-auth';
import {logAuthError} from '@/lib/auth/auth-errors';
import {
  getSafeReturnTo,
  TENANT_ACCESS_DENIED_MESSAGE,
  TENANT_ACCESS_DENIED_REASON,
} from '@/lib/auth/redirect';
import {cn} from '@/lib/utils';

function LoginForm() {
  const {signIn} = useAuth();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const tenantAccessDenied =
    searchParams.get('reason') === TENANT_ACCESS_DENIED_REASON;

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    tenantAccessDenied ? TENANT_ACCESS_DENIED_MESSAGE : null,
  );
  const [fieldErrors, setFieldErrors] = React.useState<{
    email?: string;
    password?: string;
  }>({});

  function validate(): boolean {
    const nextErrors: {email?: string; password?: string} = {};

    if (!email.trim()) {
      nextErrors.email = 'Informe seu e-mail.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'E-mail inválido.';
    }

    if (!password) {
      nextErrors.password = 'Informe sua senha.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await signIn({email, password}, returnTo);
    } catch (err) {
      if (isRedirectError(err)) {
        throw err;
      }
      const normalized = logAuthError(err, 'login');
      setError(normalized.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={Boolean(fieldErrors.email)}
          disabled={isLoading}
        />
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <Link
            href={ROUTES.recuperarSenha}
            className="text-xs text-primary hover:underline"
            tabIndex={isLoading ? -1 : 0}
          >
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(fieldErrors.password)}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground',
              isLoading && 'pointer-events-none opacity-50',
            )}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" loading={isLoading}>
        Entrar
      </Button>
    </form>
  );
}

export {LoginForm};
