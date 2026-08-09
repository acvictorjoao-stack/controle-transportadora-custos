import Link from 'next/link';

import {MasterCompanyPicker} from '@/components/master/access/master-company-picker';
import {AuthLayout} from '@/components/layout/auth-layout';
import {ROUTES} from '@/constants/routes/paths';
import {listCompanies} from '@/features/master/companies/queries';
import {getMasterActingCompanyId} from '@/lib/auth/master-company-context';
import {createClient} from '@/supabase/server';

export default async function AcessoEmpresasPage() {
  const supabase = await createClient();
  const actingCompanyId = await getMasterActingCompanyId(supabase);
  const mode = actingCompanyId ? 'switch' : 'enter';

  let companies: Array<{
    id: string;
    name: string;
    document: string | null;
    status: string;
  }> = [];
  let error: string | null = null;

  try {
    const data = await listCompanies(supabase, {
      status: 'active',
      page: 1,
      pageSize: 100,
      sortBy: 'legal_name',
      sortOrder: 'asc',
    });

    companies = data.items.map((company) => ({
      id: company.id,
      name: company.tradeName?.trim() || company.legalName,
      document: company.taxId ?? null,
      status: company.status,
    }));
  } catch (fetchError) {
    error =
      fetchError instanceof Error
        ? fetchError.message
        : 'Erro ao carregar empresas.';
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === 'switch' ? 'Trocar empresa' : 'Selecionar empresa'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha a empresa cujo dashboard deseja abrir. O acesso é validado no
            servidor.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : (
          <MasterCompanyPicker companies={companies} mode={mode} />
        )}

        <p className="text-center text-sm">
          <Link
            href={actingCompanyId ? ROUTES.dashboard : ROUTES.acesso}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Voltar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
