'use client';

import {AlertCircle, Eye, EyeOff} from 'lucide-react';
import Link from 'next/link';
import {isRedirectError} from 'next/dist/client/components/redirect-error';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ROUTES} from '@/constants/routes/paths';
import {DEFAULT_PASSWORD_POLICY} from '@/features/master/settings/types';
import {logAuthError} from '@/lib/auth/auth-errors';
import {cn} from '@/lib/utils';
import {updatePasswordAction} from '@/supabase/auth/actions';

function UpdatePasswordForm() {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  function validate(): boolean {
    const nextErrors: {password?: string; confirmPassword?: string} = {};
    const minLength = DEFAULT_PASSWORD_POLICY.min_length;

    if (!password) {
      nextErrors.password = 'Informe a nova senha.';
    } else if (password.length < minLength) {
      nextErrors.password = `A senha deve ter pelo menos ${minLength} caracteres.`;
    } else if (
      DEFAULT_PASSWORD_POLICY.require_uppercase &&
      !/[A-Z]/.test(password)
    ) {
      nextErrors.password =
        'A senha deve conter pelo menos uma letra maiúscula.';
    } else if (
      DEFAULT_PASSWORD_POLICY.require_lowercase &&
      !/[a-z]/.test(password)
    ) {
      nextErrors.password =
        'A senha deve conter pelo menos uma letra minúscula.';
    } else if (
      DEFAULT_PASSWORD_POLICY.require_number &&
      !/\d/.test(password)
    ) {
      nextErrors.password = 'A senha deve conter pelo menos um número.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirme a nova senha.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'As senhas não coincidem.';
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
      const result = await updatePasswordAction(password, confirmPassword);

      if (result && !result.success) {
        setError(
          result.error ??
            'Não foi possível atualizar a senha. Tente novamente.',
        );
      }
    } catch (err) {
      if (isRedirectError(err)) {
        throw err;
      }
      const normalized = logAuthError(err, 'update-password');
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
        <label htmlFor="password" className="text-sm font-medium">
          Nova senha
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
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
        <p className="text-xs text-muted-foreground">
          Mínimo de {DEFAULT_PASSWORD_POLICY.min_length} caracteres, com letra
          maiúscula, minúscula e número.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar nova senha
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={Boolean(fieldErrors.confirmPassword)}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground',
              isLoading && 'pointer-events-none opacity-50',
            )}
            aria-label={
              showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'
            }
            disabled={isLoading}
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-destructive">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" loading={isLoading}>
        Redefinir senha
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href={ROUTES.recuperarSenha}
          className="text-primary hover:underline"
          tabIndex={isLoading ? -1 : 0}
        >
          Solicitar novo link
        </Link>
      </p>
    </form>
  );
}

export {UpdatePasswordForm};
