import {SHELL_FALLBACKS} from '@/constants/app/shell';
import {
  getDisplayName,
  readPlanSlugFromSettings,
} from '@/features/master/companies/utils/format';
import {getPlanLabel} from '@/features/master/plans';
import type {PlanCatalogItem} from '@/features/master/plans';
import type {CompanyProfile} from '@/features/organization/companies/types';
import type {ShellTenant} from '@/types/global/navigation';

export function mapCompanyToShellTenant(
  company: CompanyProfile,
  plans: PlanCatalogItem[],
): ShellTenant {
  const settings = {...company.settings} as Record<string, unknown>;
  const planSlug = readPlanSlugFromSettings(settings);
  const name = getDisplayName(company.legalName, company.tradeName).trim();

  return {
    id: company.id,
    name: name || SHELL_FALLBACKS.companyName,
    slug: company.slug,
    plan: getPlanLabel(plans, planSlug) || SHELL_FALLBACKS.planName,
    logoUrl: company.logoUrl,
  };
}
