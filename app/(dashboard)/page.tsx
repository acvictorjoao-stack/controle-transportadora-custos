import {redirect} from 'next/navigation';

import {ContentContainer} from '@/components/layout/content-container';
import {ROUTES} from '@/constants/routes/paths';
import {
  HomePortal,
  buildHomePendingItems,
  getHomePendingSnapshot,
} from '@/features/home-portal';
import {getCurrentCompanyProfile, needsOnboarding} from '@/features/organization/companies/queries';
import {listBranches} from '@/features/organization/branches/queries';
import {OnboardingWizard} from '@/features/organization/onboarding/components';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';

/**
 * Portal de entrada do FleetControl (RC 28.0.4).
 * O Dashboard Executivo permanece em `/dashboard` como módulo analítico.
 */
export default async function HomePage() {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const [company, pendingSnapshot] = await Promise.all([
    getCurrentCompanyProfile(supabase, companyId),
    getHomePendingSnapshot(supabase, companyId),
  ]);

  const showOnboarding = company ? needsOnboarding(company) : false;
  const branches = showOnboarding
    ? await listBranches(supabase, {companyId})
    : null;

  const pendingItems = buildHomePendingItems(pendingSnapshot);

  return (
    <>
      {showOnboarding && company && branches && (
        <OnboardingWizard company={company} branches={branches} />
      )}
      <ContentContainer>
        <HomePortal pendingItems={pendingItems} />
      </ContentContainer>
    </>
  );
}
