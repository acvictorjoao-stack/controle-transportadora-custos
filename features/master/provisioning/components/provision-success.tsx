'use client';

import {CheckCircle2, Copy} from 'lucide-react';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {PROVISION_STATUS_LABELS} from '@/features/master/companies/constants';
import type {ProvisionCompanyResult} from '@/features/master/provisioning/types';
import {formatCompanyTaxIdDisplay} from '@/features/master/companies/services';

export interface ProvisionSuccessProps {
  result: ProvisionCompanyResult;
  onFinish: () => void;
}

function ProvisionSuccess({result, onFinish}: ProvisionSuccessProps) {
  const [copied, setCopied] = React.useState<'credentials' | 'url' | null>(null);

  const credentialsText = [
    `Empresa: ${result.companyName}`,
    `CNPJ: ${formatCompanyTaxIdDisplay(result.taxId)}`,
    `Slug: ${result.slug}`,
    `URL: ${result.accessUrl}`,
    `E-mail: ${result.adminEmail}`,
    `Senha temporária: ${result.temporaryPassword}`,
  ].join('\n');

  async function copyText(text: string, type: 'credentials' | 'url') {
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
          <h3 className="text-lg font-semibold">Empresa provisionada com sucesso</h3>
          <p className="text-sm text-muted-foreground">
            A estrutura da empresa está pronta para uso.
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          A senha temporária é exibida apenas nesta tela. Copie e repasse ao
          administrador com segurança.
        </AlertDescription>
      </Alert>

      <Card className="py-4 shadow-none">
        <CardHeader className="px-4 py-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Resumo do provisionamento</CardTitle>
            <Badge variant="success">
              {PROVISION_STATUS_LABELS[result.provisionStatus]}
            </Badge>
          </div>
          <CardDescription>
            Dados de acesso da empresa e do administrador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 text-sm">
          <DetailRow label="Empresa" value={result.companyName} />
          <DetailRow
            label="CNPJ"
            value={formatCompanyTaxIdDisplay(result.taxId)}
          />
          <DetailRow label="Slug" value={result.slug} mono />
          <DetailRow label="URL de acesso" value={result.accessUrl} mono />
          <DetailRow label="E-mail do administrador" value={result.adminEmail} />
          <DetailRow
            label="Senha temporária"
            value={result.temporaryPassword}
            mono
            highlight
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyText(credentialsText, 'credentials')}
        >
          <Copy className="size-4" />
          Copiar credenciais
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyText(result.accessUrl, 'url')}
        >
          <Copy className="size-4" />
          Copiar URL
        </Button>
        <Button type="button" onClick={onFinish}>
          Finalizar
        </Button>
      </div>

      {copied && (
        <p className="text-xs text-success">
          {copied === 'credentials'
            ? 'Credenciais copiadas para a área de transferência.'
            : 'URL copiada para a área de transferência.'}
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

export {ProvisionSuccess};
