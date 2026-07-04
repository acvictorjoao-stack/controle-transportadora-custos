import {redirect} from 'next/navigation';

import {CompanyPage} from '@/features/organization/companies/components';
import {getCurrentCompanyProfile, needsOnboarding} from '@/features/organization/companies/queries';
import {listBranches} from '@/features/organization/branches/queries';
import {OnboardingWizard} from '@/features/organization/onboarding/components';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface EmpresasPageProps {
  searchParams: Promise<{tab?: string}>;
}

export default async function EmpresasPage({searchParams}: EmpresasPageProps) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'companies:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  const company = await getCurrentCompanyProfile(supabase, companyId);
  if (!company) {
    redirect(ROUTES.dashboard);
  }

  const params = await searchParams;
  const initialTab = params.tab === 'configuracoes' ? 'configuracoes' : 'dados';

  const showOnboarding = needsOnboarding(company);
  const branches = showOnboarding
    ? await listBranches(supabase, {companyId})
    : null;

  return (
    <>
      {showOnboarding && branches && (
        <OnboardingWizard company={company} branches={branches} />
      )}
      <CompanyPage company={company} initialTab={initialTab} />
    </>
  );
}
