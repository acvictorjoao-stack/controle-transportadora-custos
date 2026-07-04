import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {Skeleton} from '@/components/ui/skeleton';

export default function MasterEmpresasLoading() {
  return (
    <TableContainer
      title="Empresas clientes"
      description="Carregando empresas..."
      toolbar={
        <>
          <Skeleton className="h-9 w-full sm:w-64" />
          <Skeleton className="h-9 w-28" />
        </>
      }
    >
      <DataTable
        columns={[
          {id: 'a', header: 'Empresa', cell: () => null},
          {id: 'b', header: 'Status', cell: () => null},
          {id: 'c', header: 'Provisionamento', cell: () => null},
          {id: 'd', header: 'Slug', cell: () => null},
          {id: 'e', header: 'Cadastro', cell: () => null},
        ]}
        data={[]}
        getRowKey={() => 'loading'}
        loading
      />
    </TableContainer>
  );
}
