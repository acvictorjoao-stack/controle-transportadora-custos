'use client';

import Link from 'next/link';
import {Download} from 'lucide-react';

import {DataTable} from '@/components/data-display/data-table';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button, buttonVariants} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ROUTES} from '@/constants/routes/paths';
import {
  findingDifference,
  getReconciliationCheck,
  reconciliationFindingHref,
  type ReconciliationCheckSummary,
  type ReconciliationFinding,
} from '@/features/financial/consistency/reconciliation';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import {cn} from '@/lib/utils';

import type {FinancialReconciliationData} from '../types';
import {
  ENTITY_LABELS,
  findingsToCsv,
  SEVERITY_BADGE_VARIANT,
  SEVERITY_LABELS,
} from '../utils/format';

export interface ReconciliationPageProps {
  data: FinancialReconciliationData;
  error?: string | null;
}

function money(value: number | null): string {
  return value === null ? '—' : formatCurrencyBr(value);
}

function findingKey(finding: ReconciliationFinding, index: number): string {
  return `${finding.checkId}:${finding.entityType}:${finding.entityId ?? finding.reference}:${index}`;
}

function downloadCsv(findings: readonly ReconciliationFinding[]): void {
  const blob = new Blob([findingsToCsv(findings, window.location.origin)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `conciliacao-financeira-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function FindingsTable({
  rows,
  emptyTitle,
}: {
  rows: Array<{finding: ReconciliationFinding; key: string}>;
  emptyTitle: string;
}) {
  return (
    <TableContainer>
      <DataTable
        columns={[
          {
            id: 'severity',
            header: 'Severidade',
            className: 'w-28',
            cell: ({finding}) => (
              <Badge variant={SEVERITY_BADGE_VARIANT[finding.severity]}>
                {SEVERITY_LABELS[finding.severity]}
              </Badge>
            ),
          },
          {
            id: 'check',
            header: 'Verificação',
            cell: ({finding}) => (
              <div className="flex flex-col">
                <span className="font-medium">
                  {finding.checkId} · {getReconciliationCheck(finding.checkId).title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getReconciliationCheck(finding.checkId).suggestedAction}
                </span>
              </div>
            ),
          },
          {
            id: 'record',
            header: 'Registro',
            cell: ({finding}) => {
              const href = reconciliationFindingHref(finding);
              return (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {ENTITY_LABELS[finding.entityType]}
                  </span>
                  {href ? (
                    <Link href={href} className="font-medium hover:underline">
                      {finding.reference}
                    </Link>
                  ) : (
                    <span>{finding.reference}</span>
                  )}
                </div>
              );
            },
          },
          {
            id: 'expected',
            header: 'Esperado',
            className: 'text-right',
            headerClassName: 'text-right',
            cell: ({finding}) => money(finding.expected),
          },
          {
            id: 'actual',
            header: 'Atual',
            className: 'text-right',
            headerClassName: 'text-right',
            cell: ({finding}) => money(finding.actual),
          },
          {
            id: 'difference',
            header: 'Diferença',
            className: 'text-right',
            headerClassName: 'text-right',
            cell: ({finding}) => money(findingDifference(finding)),
          },
        ]}
        data={rows}
        getRowKey={(row) => row.key}
        emptyTitle={emptyTitle}
        emptyDescription="Nenhuma inconsistência encontrada nesta verificação."
      />
    </TableContainer>
  );
}

function ChecksOverview({checks}: {checks: ReconciliationCheckSummary[]}) {
  const withFindings = checks.filter((check) => check.count > 0);
  if (withFindings.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {withFindings.map((check) => (
        <Badge key={check.checkId} variant="outline" className="gap-1.5">
          <span className="font-semibold">{check.checkId}</span>
          {check.title}
          <span className="tabular-nums">· {check.count}</span>
        </Badge>
      ))}
    </div>
  );
}

function ReconciliationPage({data, error = null}: ReconciliationPageProps) {
  const {summary, period} = data;
  const rows = data.findings.map((finding, index) => ({finding, key: findingKey(finding, index)}));
  const current = rows.filter((row) => !row.finding.legacy);
  const legacy = rows.filter((row) => row.finding.legacy);

  return (
    <PageTemplate
      title="Conciliação Financeira"
      description="Inconsistências entre o financeiro, as origens e os relatórios. A tela só aponta: nada é corrigido automaticamente."
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={data.findings.length === 0}
          onClick={() => downloadCsv(data.findings)}
        >
          <Download className="size-3.5" />
          Exportar CSV
        </Button>
      }
    >
      {[error, ...data.errors].filter(Boolean).map((message) => (
        <Alert key={message} variant="destructive" className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ))}

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">De</span>
          <Input type="date" name="dateFrom" defaultValue={period.dateFrom ?? ''} className="w-40" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Até</span>
          <Input type="date" name="dateTo" defaultValue={period.dateTo ?? ''} className="w-40" />
        </label>
        <Button type="submit" size="sm">
          Aplicar período
        </Button>
        {period.dateFrom || period.dateTo ? (
          <Link
            href={ROUTES.conciliacaoFinanceira}
            className={cn(buttonVariants({size: 'sm', variant: 'outline'}))}
          >
            Todo o período
          </Link>
        ) : null}
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Críticos"
          value={<span className={summary.bySeverity.critical ? 'text-destructive' : ''}>{summary.bySeverity.critical}</span>}
          subtitle="Dinheiro sem lançamento ou lançamento sem origem"
        />
        <StatCard
          title="Altos"
          value={<span className={summary.bySeverity.high ? 'text-warning' : ''}>{summary.bySeverity.high}</span>}
          subtitle="Valores ou relatórios que não batem"
        />
        <StatCard title="Avisos" value={summary.bySeverity.warning} subtitle="Pontos de atenção" />
        <StatCard title="Legado" value={summary.legacy} subtitle="Anteriores às regras atuais; não bloqueiam" />
      </div>

      <div className="flex flex-col gap-8">
        <Section
          title="Achados atuais"
          description="Ordenados por severidade. Cada linha leva à tela onde o registro se resolve."
        >
          <div className="mb-3">
            <ChecksOverview checks={summary.byCheck.map((check) => ({...check, count: check.count - check.legacyCount}))} />
          </div>
          <FindingsTable rows={current} emptyTitle="Nenhuma inconsistência atual" />
        </Section>

        {legacy.length > 0 ? (
          <Section
            title={`Legado (${legacy.length})`}
            description="Registros anteriores às regras atuais (ex.: recebimento quitado antes dos movimentos de caixa). Regularização em lote, com decisão própria."
          >
            <details>
              <summary className="mb-3 cursor-pointer text-sm text-muted-foreground">
                Mostrar os {legacy.length} achados legados
              </summary>
              <FindingsTable rows={legacy} emptyTitle="Nenhum achado legado" />
            </details>
          </Section>
        ) : null}

        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {data.truncatedChecks.length > 0 ? (
            <p>
              Listagem limitada nas verificações {data.truncatedChecks.join(', ')}: há mais achados do que os exibidos.
            </p>
          ) : null}
          {data.coverage ? (
            <p>
              Comparações de relatório: {data.coverage.tripsChecked} viagem(ns) e{' '}
              {data.coverage.cashFlowLinesChecked} movimento(s) de caixa no recorte. DRE × indicadores (R11) usa sempre o acumulado da empresa.
            </p>
          ) : null}
          <p>As verificações do lado da origem cobrem os módulos que você pode consultar.</p>
        </div>
      </div>
    </PageTemplate>
  );
}

export {ReconciliationPage};
