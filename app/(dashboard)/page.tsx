import {redirect} from 'next/navigation';

import {ContentContainer} from '@/components/layout/content-container';
import {ROUTES} from '@/constants/routes/paths';
import {HomePortal} from '@/features/home-portal';
import {getCurrentCompanyProfile, needsOnboarding} from '@/features/organization/companies/queries';
import {listBranches} from '@/features/organization/branches/queries';
import {OnboardingWizard} from '@/features/organization/onboarding/components';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

/**
 * Portal de navegação do FleetControl (RC 28.0.6).
 * Apenas saudação, busca e cards de módulos — indicadores ficam no Dashboard.
 */
export default async function HomePage() {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const company = await getCurrentCompanyProfile(supabase, companyId);
  const showOnboarding = company ? needsOnboarding(company) : false;
  const branches = showOnboarding
    ? await listBranches(supabase, {companyId})
    : null;

  return (
    <>
      {showOnboarding && company && branches && (
        <OnboardingWizard company={company} branches={branches} />
      )}
      <ContentContainer>
        <HomePortal />
      </ContentContainer>
    </>
  );
}
