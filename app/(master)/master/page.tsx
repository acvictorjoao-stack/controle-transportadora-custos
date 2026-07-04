import {MasterDashboardKpis, RecentSignupsTable} from '@/components/master/dashboard';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {
  getMasterDashboardStats,
  getRecentSignups,
} from '@/features/master/dashboard';
import {getPlanCatalog} from '@/features/master/plans';
import {createClient} from '@/supabase/server';

export default async function MasterDashboardPage() {
  let stats = null;
  let signups = null;
  let plans = null;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    [stats, signups, plans] = await Promise.all([
      getMasterDashboardStats(supabase),
      getRecentSignups(supabase),
      getPlanCatalog(supabase),
    ]);
  } catch (fetchError) {
    error =
      fetchError instanceof Error
        ? fetchError.message
        : 'Erro ao carregar dashboard.';
  }

  return (
    <PageTemplate
      title="Dashboard Master"
      description="Visão geral da plataforma FleetControl — administração SaaS"
      showBreadcrumb={false}
    >
      {error && (
        <Section>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </Section>
      )}

      {stats && plans && (
        <Section>
          <MasterDashboardKpis stats={stats} plans={plans} />
        </Section>
      )}

      {signups && plans && (
        <Section className="mt-6">
          <RecentSignupsTable signups={signups} plans={plans} />
        </Section>
      )}
    </PageTemplate>
  );
}
