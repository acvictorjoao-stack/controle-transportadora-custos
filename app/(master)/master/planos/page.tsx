import {PlansGrid} from '@/components/master/plans';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {getPlanCatalog} from '@/features/master/plans';
import {createClient} from '@/supabase/server';

export default async function MasterPlanosPage() {
  const supabase = await createClient();
  const plans = await getPlanCatalog(supabase);

  return (
    <PageTemplate
      title="Planos"
      description="Planos de assinatura disponíveis na plataforma"
    >
      <Section>
        <PlansGrid plans={plans} />
      </Section>
    </PageTemplate>
  );
}
