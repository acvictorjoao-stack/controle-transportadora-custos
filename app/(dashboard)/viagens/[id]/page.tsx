import {notFound, redirect} from 'next/navigation';

import {listCustomersForSelect} from '@/features/customers/queries';
import type {Customer} from '@/features/customers/types';
import {listDriversForSelect} from '@/features/drivers/queries';
import type {DriverSelectOption} from '@/features/drivers/types';
import '@/features/financial/loaders/module-integration-loaders';
import {listBranchesForSelect} from '@/features/organization/branches/queries';
import type {BranchSelectOption} from '@/features/organization/branches/types';
import {listRoutesForSelect} from '@/features/routes/queries';
import type {RouteSelectOption} from '@/features/routes/types';
import {TripDetailView} from '@/features/trips/components';
import {getTripDetail, listTripResourceAvailability} from '@/features/trips/queries';
import type {TripDetailData, TripResourceAvailability} from '@/features/trips/types';
import {listVehiclesForSelect} from '@/features/vehicles/queries';
import type {VehicleSelectOption} from '@/features/vehicles/types';
import {
  assertCompanyPermission,
  getCurrentCompanyId,
  getServerSupabaseClient,
} from '@/lib/auth/company';
import {ROUTES} from '@/constants/routes/paths';

interface ViagemDetailPageProps {
  params: Promise<{id: string}>;
}

export default async function ViagemDetailPage({params}: ViagemDetailPageProps) {
  const {id} = await params;
  const supabase = await getServerSupabaseClient();
  const companyId = await getCurrentCompanyId(supabase);

  if (!companyId) {
    redirect(ROUTES.login);
  }

  const canRead = await assertCompanyPermission(supabase, companyId, 'trips:read');
  if (!canRead) {
    redirect(ROUTES.dashboard);
  }

  // Busca a viagem isoladamente: só um resultado nulo (viagem inexistente) deve
  // gerar 404. Erros reais de infraestrutura devem propagar para o error boundary
  // da rota em vez de serem mascarados como "viagem não encontrada".
  const data: TripDetailData | null = await getTripDetail(supabase, companyId, id);

  if (!data) {
    notFound();
  }

  // Dados auxiliares (para os selects do formulário) são carregados fora do
  // fluxo que decide o 404: uma falha aqui não deve impedir a visualização da
  // viagem já carregada.
  const [branches, drivers, vehicles, customers, routes, resourceAvailability]: [
    BranchSelectOption[],
    DriverSelectOption[],
    VehicleSelectOption[],
    Customer[],
    RouteSelectOption[],
    TripResourceAvailability,
  ] = await Promise.all([
    listBranchesForSelect(supabase, companyId),
    listDriversForSelect(supabase, companyId),
    listVehiclesForSelect(supabase, companyId),
    listCustomersForSelect(supabase, companyId),
    listRoutesForSelect(supabase, companyId, 200),
    listTripResourceAvailability(supabase, companyId),
  ]);

  return (
    <TripDetailView
      companyId={companyId}
      data={data}
      branches={branches}
      drivers={drivers}
      vehicles={vehicles}
      customers={customers}
      routes={routes}
      resourceAvailability={resourceAvailability}
    />
  );
}
