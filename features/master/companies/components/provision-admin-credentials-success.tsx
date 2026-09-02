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
import type {AdminCredentialsResult} from '@/features/master/companies/actions';

export interface ProvisionAdminCredentialsSuccessProps {
  credentials: AdminCredentialsResult;
  onFinish: () => void;
}

function ProvisionAdminCredentialsSuccess({
  credentials,
  onFinish,
}: ProvisionAdminCredentialsSuccessProps) {
  const [copied, setCopied] = React.useState<'password' | 'credentials' | null>(
    null,
  );

  const credentialsText = [
    `URL: ${credentials.accessUrl}`,
    `E-mail: ${credentials.adminEmail}`,
    `Senha temporária: ${credentials.temporaryPassword}`,
  ].join('\n');

  async function copyText(text: string, type: 'password' | 'credentials') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Administrador provisionado</h3>
          <p className="text-sm text-muted-foreground">
            Repasse as credenciais ao administrador com segurança.
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
          <CardDescription>Perfil Administrador da empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 text-sm">
          <DetailRow label="E-mail" value={credentials.adminEmail} />
          <DetailRow
            label="Senha temporária"
            value={credentials.temporaryPassword}
            mono
            highlight
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyText(credentials.temporaryPassword, 'password')}
        >
          <Copy className="size-4" />
          Copiar senha
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyText(credentialsText, 'credentials')}
        >
          <Copy className="size-4" />
          Copiar credenciais
        </Button>
        <Button type="button" onClick={onFinish}>
          Finalizar
        </Button>
      </div>

      {copied && (
        <p className="text-xs text-success">
          {copied === 'password'
            ? 'Senha copiada para a área de transferência.'
            : 'Credenciais copiadas para a área de transferência.'}
        </p>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          mono
            ? `font-mono text-xs font-medium ${highlight ? 'text-primary' : ''}`
            : 'font-medium'
        }
      >
        {value}
      </span>
    </div>
  );
}

export {ProvisionAdminCredentialsSuccess};
