'use client';

import {CheckCircle2, Copy} from 'lucide-react';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {PortalUserCredentials} from '@/features/master/users/actions/portal-user-actions';

export interface PortalUserCredentialsSuccessProps {
  credentials: PortalUserCredentials;
  title?: string;
  onFinish: () => void;
}

function PortalUserCredentialsSuccess({
  credentials,
  title = 'Usuário criado com sucesso',
  onFinish,
}: PortalUserCredentialsSuccessProps) {
  const [copied, setCopied] = React.useState(false);

  const credentialsText = [
    `E-mail: ${credentials.email}`,
    `Senha temporária: ${credentials.temporaryPassword}`,
  ].join('\n');

  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            Repasse as credenciais ao usuário com segurança.
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          A senha temporária é exibida apenas nesta tela. Copie antes de fechar.
        </AlertDescription>
      </Alert>

      <Card className="py-4 shadow-none">
        <CardHeader className="px-4 py-0">
          <CardTitle className="text-base">Credenciais de acesso</CardTitle>
          <CardDescription>Dados para o primeiro login</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="text-muted-foreground">E-mail</span>
            <span className="font-medium">{credentials.email}</span>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <span className="text-muted-foreground">Senha temporária</span>
            <span className="font-mono text-xs font-medium text-primary">
              {credentials.temporaryPassword}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => void copyCredentials()}>
          <Copy className="size-4" />
          Copiar credenciais
        </Button>
        <Button type="button" onClick={onFinish}>
          Finalizar
        </Button>
      </div>

      {copied && (
        <p className="text-xs text-success">
          Credenciais copiadas para a área de transferência.
        </p>
      )}
    </div>
  );
}

export {PortalUserCredentialsSuccess};
