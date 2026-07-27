'use client';

import Link from 'next/link';
import {Pencil} from 'lucide-react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {buttonVariants} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {ROUTES} from '@/constants/routes/paths';
import {cn} from '@/lib/utils';

import type {CadastroQualityRouteItem} from '../types';

export interface RoutesWithoutLeadTimeAlertProps {
  routes: CadastroQualityRouteItem[];
  /** Quando true, lista completa; caso contrário, resumo curto. */
  compact?: boolean;
  /** Link para a tela de qualidade dos cadastros. */
  showQualityLink?: boolean;
}

function RoutesWithoutLeadTimeAlert({
  routes,
  compact = false,
  showQualityLink = true,
}: RoutesWithoutLeadTimeAlertProps) {
  if (routes.length === 0) return null;

  const visible = compact ? routes.slice(0, 5) : routes;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Rotas sem Lead Time configurado
            </CardTitle>
            <CardDescription>
              Cadastre o Lead Time para alimentar SLA, atrasos e Inteligência
              Operacional.
            </CardDescription>
          </div>
          <Badge variant="destructive">{routes.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="destructive">
          <AlertTitle>Atenção administrativa</AlertTitle>
          <AlertDescription>
            {routes.length === 1
              ? 'Existe 1 rota sem Lead Time.'
              : `Existem ${routes.length} rotas sem Lead Time.`}{' '}
            Regularize os cadastros para manter os indicadores confiáveis.
          </AlertDescription>
        </Alert>

        <TableContainer>
          <DataTable
            columns={[
              {
                id: 'name',
                header: 'Rota',
                cell: (row: CadastroQualityRouteItem) => (
                  <Link
                    href={ROUTES.rotaDetail(row.id)}
                    className="font-medium hover:underline"
                  >
                    {row.name}
                  </Link>
                ),
              },
              {
                id: 'customer',
                header: 'Cliente',
                cell: (row: CadastroQualityRouteItem) =>
                  row.customerName ?? '—',
              },
              {
                id: 'company',
                header: 'Empresa',
                cell: (row: CadastroQualityRouteItem) => row.companyName,
              },
              {
                id: 'actions',
                header: '',
                className: 'w-32',
                cell: (row: CadastroQualityRouteItem) => (
                  <Link
                    href={ROUTES.rotaDetail(row.id)}
                    className={cn(buttonVariants({size: 'sm', variant: 'outline'}))}
                  >
                    <Pencil className="size-3.5" />
                    Editar rota
                  </Link>
                ),
              },
            ]}
            data={visible}
            getRowKey={(row) => row.id}
            emptyTitle="Nenhuma rota pendente"
            emptyDescription=""
          />
        </TableContainer>

        {showQualityLink ? (
          <div className="flex justify-end">
            <Link
              href={ROUTES.qualidadeCadastros}
              className={cn(
                buttonVariants({variant: 'link', size: 'sm'}),
                'px-0',
              )}
            >
              Ver Qualidade dos Cadastros
            </Link>
          </div>
        ) : null}

        {compact && routes.length > visible.length ? (
          <p className="text-xs text-muted-foreground">
            +{routes.length - visible.length} rota
            {routes.length - visible.length === 1 ? '' : 's'} adicional
            {routes.length - visible.length === 1 ? '' : 'is'}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export {RoutesWithoutLeadTimeAlert};
