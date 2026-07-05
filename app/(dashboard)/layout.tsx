import {DashboardLayout} from '@/components/layout/dashboard-layout';
import {NavPermissionsProvider} from '@/contexts/auth/nav-permissions-context';
import {ShellProvider} from '@/contexts/shell/shell-context';
import {getCurrentCompanyProfile} from '@/features/organization/companies/queries';
import {getPlanCatalog} from '@/features/master/plans';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {getCompanyMemberPermissions} from '@/lib/auth/queries/permissions';
import {mapCompanyToShellTenant} from '@/lib/shell/map-company-tenant';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);
  const permissions = companyId
    ? await getCompanyMemberPermissions(supabase, companyId)
    : [];

  let shellTenant = null;

  if (companyId) {
    const [company, plans] = await Promise.all([
      getCurrentCompanyProfile(supabase, companyId),
      getPlanCatalog(supabase),
    ]);

    if (company) {
      shellTenant = mapCompanyToShellTenant(company, plans);
    }
  }

  return (
    <NavPermissionsProvider permissions={permissions}>
      <ShellProvider tenant={shellTenant}>
        <DashboardLayout>{children}</DashboardLayout>
      </ShellProvider>
    </NavPermissionsProvider>
  );
}
