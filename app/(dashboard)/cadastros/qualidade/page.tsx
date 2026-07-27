import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {CadastroQualityPage} from '@/features/cadastro-quality/components';
import {getCadastroQualityData} from '@/features/cadastro-quality/loaders';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

export default async function QualidadeCadastrosPage() {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'routes:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  let data;
  let error: string | null = null;

  try {
    data = await getCadastroQualityData(supabase, companyId);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : 'Erro ao carregar qualidade dos cadastros.';
    data = {
      companyName: '—',
      summary: {
        missingLeadTime: 0,
        missingUnloadTime: 0,
        inactive: 0,
        totalRoutes: 0,
      },
      withoutLeadTime: [],
      withoutUnloadTime: [],
      inactive: [],
    };
  }

  return <CadastroQualityPage data={data} error={error} />;
}
