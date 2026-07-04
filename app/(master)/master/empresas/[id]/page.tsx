import {notFound} from 'next/navigation';

import {EmpresaDetail} from '@/components/master/empresas';
import {fetchCompanyDetailById} from '@/features/master/companies/actions';
import {getDisplayName} from '@/features/master/companies/utils/format';
import {getPlanCatalog} from '@/features/master/plans';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {createClient} from '@/supabase/server';

interface MasterEmpresaDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function MasterEmpresaDetailPage({
  params,
}: MasterEmpresaDetailPageProps) {
  const {id} = await params;
  const supabase = await createClient();
  const [company, plans] = await Promise.all([
    fetchCompanyDetailById(id),
    getPlanCatalog(supabase),
  ]);

  if (!company) {
    notFound();
  }

  return (
    <PageTemplate
      title={getDisplayName(company.legalName, company.tradeName)}
      description={company.legalName}
    >
      <Section>
        <EmpresaDetail key={company.updatedAt} company={company} plans={plans} />
      </Section>
    </PageTemplate>
  );
}
