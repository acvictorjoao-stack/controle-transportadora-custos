import {redirect, notFound} from 'next/navigation';



import '@/features/financial/loaders/module-integration-loaders';

import {listBranchesForSelect} from '@/features/organization/branches/queries';

import type {BranchSelectOption} from '@/features/organization/branches/types';

import {DriverDetailView} from '@/features/drivers/components';

import {getDriverDetail} from '@/features/drivers/queries';

import type {DriverDetailData} from '@/features/drivers/types';

import {

  assertCompanyPermission,

  getCurrentCompanyId,

  getServerSupabaseClient,

} from '@/lib/auth/company';

import {ROUTES} from '@/constants/routes/paths';



interface MotoristaDetailPageProps {

  params: Promise<{id: string}>;

}



export default async function MotoristaDetailPage({params}: MotoristaDetailPageProps) {

  const {id} = await params;

  const supabase = await getServerSupabaseClient();

  const companyId = await getCurrentCompanyId(supabase);



  if (!companyId) {

    redirect(ROUTES.login);

  }



  const canRead = await assertCompanyPermission(supabase, companyId, 'drivers:read');

  if (!canRead) {

    redirect(ROUTES.dashboard);

  }



  let data: DriverDetailData | null;

  let branches: BranchSelectOption[];



  try {

    [data, branches] = await Promise.all([

      getDriverDetail(supabase, companyId, id),

      listBranchesForSelect(supabase, companyId),

    ]);

  } catch {

    notFound();

  }



  if (!data) {

    notFound();

  }



  return (

    <DriverDetailView

      companyId={companyId}

      data={data}

      branches={branches}

    />

  );

}


