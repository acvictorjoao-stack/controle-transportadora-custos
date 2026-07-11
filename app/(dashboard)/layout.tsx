import {DashboardLayout} from '@/components/layout/dashboard-layout';
import {NavPermissionsProvider} from '@/contexts/auth/nav-permissions-context';
import {ShellProvider} from '@/contexts/shell/shell-context';
import {getCurrentCompanyProfile} from '@/features/organization/companies/queries';
import {getPlanCatalog} from '@/features/master/plans';
import {
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {getCompanyMemberPermissions} from '@/lib/auth/queries/permissions';
import {requireTenantAccess} from '@/lib/auth/tenant-access';
import {mapCompanyToShellTenant} from '@/lib/shell/map-company-tenant';

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabaseClient();
  const membership = await requireTenantAccess(supabase);
  const companyId = membership.companyId;
  const permissions = await getCompanyMemberPermissions(supabase, companyId);

  const [company, plans] = await Promise.all([
    getCurrentCompanyProfile(supabase, companyId),
    getPlanCatalog(supabase),
  ]);

  const shellTenant = company ? mapCompanyToShellTenant(company, plans) : null;

  return (
    <NavPermissionsProvider permissions={permissions}>
      <ShellProvider tenant={shellTenant}>
        <DashboardLayout>{children}</DashboardLayout>
      </ShellProvider>
    </NavPermissionsProvider>
  );
}
