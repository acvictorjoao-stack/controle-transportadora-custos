import {DashboardLayout} from '@/components/layout/dashboard-layout';
import {NavPermissionsProvider} from '@/contexts/auth/nav-permissions-context';
import {
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {getCompanyMemberPermissions} from '@/lib/auth/queries/permissions';

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

  return (
    <NavPermissionsProvider permissions={permissions}>
      <DashboardLayout>{children}</DashboardLayout>
    </NavPermissionsProvider>
  );
}
