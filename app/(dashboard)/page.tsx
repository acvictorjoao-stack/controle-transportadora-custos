import {redirect} from 'next/navigation';

import {ROUTES} from '@/constants/routes/paths';
import {HomePortal} from '@/features/home-portal';
import {getCurrentCompanyProfile, needsOnboarding} from '@/features/organization/companies/queries';
import {listBranches} from '@/features/organization/branches/queries';
import {OnboardingWizard} from '@/features/organization/onboarding/components';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {cn} from '@/lib/utils';

/**
 * Portal de navegação do FleetControl (RC 28.0.7).
 * Sem Sidebar — conteúdo em largura total com max 1440px.
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
      <div
        data-slot="home-portal-container"
        className={cn(
          'mx-auto w-full max-w-[1440px] px-8 py-8',
        )}
      >
        <HomePortal />
      </div>
    </>
  );
}
