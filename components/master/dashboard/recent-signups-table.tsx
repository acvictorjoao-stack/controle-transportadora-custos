import Link from 'next/link';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Badge} from '@/components/ui/badge';
import {ROUTES} from '@/constants/routes/paths';
import {ENTITY_STATUS_LABELS} from '@/features/master/companies/constants';
import {getDisplayName} from '@/features/master/companies/utils/format';
import type {RecentSignupItem} from '@/features/master/dashboard';
import {getPlanLabel, type PlanCatalogItem} from '@/features/master/plans';

export interface RecentSignupsTableProps {
  signups: RecentSignupItem[];
  plans: PlanCatalogItem[];
}

function getStatusVariant(status: RecentSignupItem['status']) {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'inactive':
    case 'blocked':
      return 'warning' as const;
    default:
      return 'secondary' as const;
  }
}

function RecentSignupsTable({signups, plans}: RecentSignupsTableProps) {
  const columns = [
    {
      id: 'empresa',
      header: 'Empresa',
      cell: (row: RecentSignupItem) => (
        <div>
          <p className="font-medium">
            {getDisplayName(row.legalName, row.tradeName)}
          </p>
          <p className="text-xs text-muted-foreground">{row.legalName}</p>
        </div>
      ),
    },
    {
      id: 'plano',
      header: 'Plano',
      cell: (row: RecentSignupItem) => (
        <Badge variant="secondary">
          {getPlanLabel(plans, row.planSlug)}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: RecentSignupItem) => (
        <Badge variant={getStatusVariant(row.status)}>
          {ENTITY_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      id: 'data',
      header: 'Cadastro',
      cell: (row: RecentSignupItem) => (
        <span className="text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      id: 'acao',
      header: '',
      cell: (row: RecentSignupItem) => (
        <Link
          href={ROUTES.masterEmpresaDetail(row.id)}
          className="text-sm text-primary hover:underline"
        >
          Ver detalhes
        </Link>
      ),
      className: 'text-right',
    },
  ];

  return (
    <TableContainer
      title="Últimos cadastros"
      description="Empresas clientes cadastradas recentemente na plataforma"
    >
      <DataTable
        columns={columns}
        data={signups}
        getRowKey={(row) => row.id}
        emptyTitle="Nenhum cadastro recente"
        emptyDescription="Novas empresas aparecerão aqui após o provisionamento."
      />
    </TableContainer>
  );
}

export {RecentSignupsTable};
