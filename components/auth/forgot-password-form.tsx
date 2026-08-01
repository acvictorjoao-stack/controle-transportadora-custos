'use client';

import {AlertCircle, CheckCircle2} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ROUTES} from '@/constants/routes/paths';
import {logAuthError} from '@/lib/auth/auth-errors';
import {requestPasswordResetAction} from '@/supabase/auth/actions';

function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );
  const [fieldError, setFieldError] = React.useState<string | undefined>();

  function validate(): boolean {
    if (!email.trim()) {
      setFieldError('Informe seu e-mail.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('E-mail inválido.');
      return false;
    }

    setFieldError(undefined);
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await requestPasswordResetAction(email);

      if (!result.success) {
        setError(
          result.error ??
            'Não foi possível enviar o e-mail de recuperação. Tente novamente.',
        );
        return;
      }

      setSuccessMessage(
        result.message ??
          'Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.',
      );
    } catch (err) {
      const normalized = logAuthError(err, 'forgot-password');
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

      {successMessage && (
        <Alert variant="success">
          <CheckCircle2 />
          <AlertDescription>{successMessage}</AlertDescription>
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
          error={Boolean(fieldError)}
          disabled={isLoading || Boolean(successMessage)}
        />
        {fieldError && (
          <p className="text-xs text-destructive">{fieldError}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={isLoading}
        disabled={Boolean(successMessage)}
      >
        Enviar link de recuperação
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href={ROUTES.login}
          className="text-primary hover:underline"
          tabIndex={isLoading ? -1 : 0}
        >
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}

export {ForgotPasswordForm};
