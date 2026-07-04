import type {SupabaseClient} from '@supabase/supabase-js';

import {getDisplayName} from '@/features/master/companies/utils/format';
import {getCustomerStats} from '@/features/customers/queries';
import {getDriverStats} from '@/features/drivers/queries';
import {getFinancialStats} from '@/features/financial/queries';
import {getFuelStats} from '@/features/fuel/queries';
import {getMaintenanceStats} from '@/features/maintenance/queries';
import {getTireStats} from '@/features/tires/queries';
import {getTripStats} from '@/features/trips/queries';
import {getVehicleStats} from '@/features/vehicles/queries';

import {countActiveBranches} from '../../branches/queries';
import type {CompanyDashboardData} from '../types';

function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

async function countCompanyMembers(
  supabase: SupabaseClient,
  companyId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from('company_members')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) return 0;
  return count ?? 0;
}

export async function getCompanyDashboardData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyDashboardData> {
  const {data: company} = await supabase
    .from('companies')
    .select('legal_name, trade_name, settings')
    .eq('id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  const companyName = company
    ? getDisplayName(company.legal_name, company.trade_name)
    : 'Sua empresa';

  const settings =
    company?.settings && typeof company.settings === 'object'
      ? (company.settings as Record<string, unknown>)
      : {};
  const currency =
    typeof settings.currency === 'string' ? settings.currency : 'BRL';

  const [branchCount, memberCount, vehicleStats, driverStats, tripStats, fuelStats, maintenanceStats, tireStats, financialStats, customerStats] = await Promise.all([
    countActiveBranches(supabase, companyId),
    countCompanyMembers(supabase, companyId),
    getVehicleStats(supabase, companyId),
    getDriverStats(supabase, companyId),
    getTripStats(supabase, companyId),
    getFuelStats(supabase, companyId),
    getMaintenanceStats(supabase, companyId),
    getTireStats(supabase, companyId),
    getFinancialStats(supabase, companyId),
    getCustomerStats(supabase, companyId),
  ]);

  const formatTrend = (value: number) => ({
    value: value >= 0 ? `+${value.toLocaleString('pt-BR')}%` : `${value.toLocaleString('pt-BR')}%`,
    positive: value >= 0,
  });

  return {
    header: {
      title: 'Dashboard Executivo',
      description:
        'Visão consolidada da performance financeira e operacional da sua frota.',
      companyName,
    },
    counts: {
      branches: branchCount,
      members: memberCount,
      vehicles: vehicleStats.total,
      drivers: driverStats.total,
      trips: tripStats.total,
      fuelRecords: fuelStats.total,
      maintenanceRecords: maintenanceStats.total,
      tires: tireStats.total,
    },
    vehicleStats,
    driverStats,
    tripStats,
    fuelStats,
    maintenanceStats,
    tireStats,
    financialStats,
    customerStats,
    kpis: [
      {
        id: 'clientes-total',
        label: 'Total de Clientes',
        value: String(customerStats.total),
        description: 'base comercial',
        trend: {value: '—', positive: true},
      },
      {
        id: 'clientes-ativos',
        label: 'Clientes Ativos',
        value: String(customerStats.active),
        description: 'em operação',
        trend: {value: '—', positive: true},
      },
      {
        id: 'clientes-inativos',
        label: 'Clientes Inativos',
        value: String(customerStats.inactive),
        description: 'fora de operação',
        trend: {value: '—', positive: false},
      },
      {
        id: 'contratos-ativos',
        label: 'Contratos Ativos',
        value: String(customerStats.activeContracts),
        description: 'vigentes',
        trend: {value: '—', positive: true},
      },
      {
        id: 'contratos-vencendo',
        label: 'Contratos Vencendo',
        value: String(customerStats.expiringContracts),
        description: 'próximos 30 dias',
        trend: {value: '—', positive: false},
      },
      {
        id: 'receita-contratada',
        label: 'Receita Contratada',
        value: formatCurrency(customerStats.contractedRevenue, currency),
        description: 'contratos ativos',
        trend: {value: '—', positive: true},
      },
      {
        id: 'veiculos-total',
        label: 'Total de Veículos',
        value: String(vehicleStats.total),
        description: 'frota cadastrada',
        trend: {value: '—', positive: true},
      },
      {
        id: 'veiculos-ativos',
        label: 'Veículos Ativos',
        value: String(vehicleStats.active),
        description: 'em operação',
        trend: {value: '—', positive: true},
      },
      {
        id: 'veiculos-manutencao',
        label: 'Em Manutenção',
        value: String(vehicleStats.maintenance),
        description: 'fora de operação temporária',
        trend: {value: '—', positive: false},
      },
      {
        id: 'veiculos-inativos',
        label: 'Inativos',
        value: String(vehicleStats.inactive),
        description: 'fora de operação',
        trend: {value: '—', positive: false},
      },
      {
        id: 'veiculos-km-media',
        label: 'Quilometragem Média',
        value: `${vehicleStats.averageOdometerKm.toLocaleString('pt-BR')} km`,
        description: 'hodômetro médio da frota',
        trend: {value: '—', positive: true},
      },
      {
        id: 'motoristas-total',
        label: 'Total de Motoristas',
        value: String(driverStats.total),
        description: 'equipe cadastrada',
        trend: {value: '—', positive: true},
      },
      {
        id: 'motoristas-ativos',
        label: 'Motoristas Ativos',
        value: String(driverStats.active),
        description: 'em operação',
        trend: {value: '—', positive: true},
      },
      {
        id: 'motoristas-inativos',
        label: 'Motoristas Inativos',
        value: String(driverStats.inactive),
        description: 'fora de operação',
        trend: {value: '—', positive: false},
      },
      {
        id: 'motoristas-cnh-vencendo',
        label: 'CNH Vencendo',
        value: String(driverStats.cnhExpiring),
        description: 'próximos 30 dias',
        trend: {value: '—', positive: false},
      },
      {
        id: 'motoristas-cnh-vencidas',
        label: 'CNH Vencidas',
        value: String(driverStats.cnhExpired),
        description: 'requer atenção imediata',
        trend: {value: '—', positive: false},
      },
      {
        id: 'motoristas-ear-pendente',
        label: 'EAR Pendente',
        value: String(driverStats.earPending),
        description: 'ativos sem EAR',
        trend: {value: '—', positive: false},
      },
      {
        id: 'viagens-total',
        label: 'Total de Viagens',
        value: String(tripStats.total),
        description: 'viagens cadastradas',
        trend: {value: '—', positive: true},
      },
      {
        id: 'viagens-em-andamento',
        label: 'Em Andamento',
        value: String(tripStats.inProgress),
        description: 'viagens ativas',
        trend: {value: '—', positive: true},
      },
      {
        id: 'viagens-concluidas',
        label: 'Concluídas',
        value: String(tripStats.completed),
        description: 'viagens finalizadas',
        trend: {value: '—', positive: true},
      },
      {
        id: 'viagens-canceladas',
        label: 'Canceladas',
        value: String(tripStats.cancelled),
        description: 'viagens canceladas',
        trend: {value: '—', positive: false},
      },
      {
        id: 'viagens-tempo-medio',
        label: 'Tempo Médio',
        value: `${tripStats.averageDurationHours.toLocaleString('pt-BR')} h`,
        description: 'duração média das viagens',
        trend: {value: '—', positive: true},
      },
      {
        id: 'viagens-km-rodados',
        label: 'KM Rodados',
        value: `${tripStats.totalKm.toLocaleString('pt-BR')} km`,
        description: 'quilometragem total',
        trend: {value: '—', positive: true},
      },
      {
        id: 'viagens-motoristas',
        label: 'Motoristas em Viagem',
        value: String(tripStats.driversOnTrip),
        description: 'em operação agora',
        trend: {value: '—', positive: true},
      },
      {
        id: 'viagens-veiculos',
        label: 'Veículos em Viagem',
        value: String(tripStats.vehiclesOnTrip),
        description: 'em operação agora',
        trend: {value: '—', positive: true},
      },
      {
        id: 'viagens-ocorrencias',
        label: 'Ocorrências',
        value: String(tripStats.occurrences),
        description: 'registradas',
        trend: {value: '—', positive: false},
      },
      {
        id: 'viagens-entregas',
        label: 'Entregas Concluídas',
        value: String(tripStats.deliveriesCompleted),
        description: 'viagens entregues',
        trend: {value: '—', positive: true},
      },
      {
        id: 'abastecimentos-total',
        label: 'Total Abastecimentos',
        value: String(fuelStats.total),
        description: 'registros de combustível',
        trend: {value: '—', positive: true},
      },
      {
        id: 'abastecimentos-litros',
        label: 'Litros Abastecidos',
        value: `${fuelStats.totalLiters.toLocaleString('pt-BR')} L`,
        description: 'volume total',
        trend: {value: '—', positive: true},
      },
      {
        id: 'abastecimentos-valor',
        label: 'Valor Total Combustível',
        value: formatCurrency(fuelStats.totalAmount, currency),
        description: 'gasto com abastecimentos',
        trend: {value: '—', positive: false},
      },
      {
        id: 'abastecimentos-preco-medio',
        label: 'Preço Médio/L',
        value: formatCurrency(fuelStats.averagePricePerLiter, currency),
        description: 'média ponderada',
        trend: {value: '—', positive: false},
      },
      {
        id: 'abastecimentos-consumo',
        label: 'Consumo Médio',
        value: `${fuelStats.averageConsumptionLPer100km.toLocaleString('pt-BR')} L/100km`,
        description: 'média da frota',
        trend: {value: '—', positive: true},
      },
      {
        id: 'abastecimentos-km-l',
        label: 'KM/L Médio',
        value: `${fuelStats.averageKmPerLiter.toLocaleString('pt-BR')} km/L`,
        description: 'eficiência média',
        trend: {value: '—', positive: true},
      },
      {
        id: 'abastecimentos-veiculo-economico',
        label: 'Veículo Mais Econômico',
        value: fuelStats.mostEconomicalVehicle?.name ?? '—',
        description: fuelStats.mostEconomicalVehicle
          ? `${fuelStats.mostEconomicalVehicle.kmPerLiter.toLocaleString('pt-BR')} km/L`
          : 'sem dados',
        trend: {value: '—', positive: true},
      },
      {
        id: 'abastecimentos-veiculo-gasto',
        label: 'Veículo Menos Econômico',
        value: fuelStats.leastEconomicalVehicle?.name ?? '—',
        description: fuelStats.leastEconomicalVehicle
          ? `${fuelStats.leastEconomicalVehicle.kmPerLiter.toLocaleString('pt-BR')} km/L`
          : 'sem dados',
        trend: {value: '—', positive: false},
      },
      {
        id: 'abastecimentos-motorista-economico',
        label: 'Motorista Mais Econômico',
        value: fuelStats.mostEconomicalDriver?.name ?? '—',
        description: fuelStats.mostEconomicalDriver
          ? `${fuelStats.mostEconomicalDriver.kmPerLiter.toLocaleString('pt-BR')} km/L`
          : 'sem dados',
        trend: {value: '—', positive: true},
      },
      {
        id: 'abastecimentos-motorista-gasto',
        label: 'Motorista Menos Econômico',
        value: fuelStats.leastEconomicalDriver?.name ?? '—',
        description: fuelStats.leastEconomicalDriver
          ? `${fuelStats.leastEconomicalDriver.kmPerLiter.toLocaleString('pt-BR')} km/L`
          : 'sem dados',
        trend: {value: '—', positive: false},
      },
      {
        id: 'abastecimentos-inconsistentes',
        label: 'Abastecimentos Inconsistentes',
        value: String(fuelStats.inconsistentCount),
        description: 'requer revisão',
        trend: {value: '—', positive: false},
      },
      {
        id: 'pneus-total',
        label: 'Total de Pneus',
        value: String(tireStats.total),
        description: 'cadastrados na frota',
        trend: {value: '—', positive: true},
      },
      {
        id: 'pneus-instalados',
        label: 'Pneus Instalados',
        value: String(tireStats.installed),
        description: 'em veículos',
        trend: {value: '—', positive: true},
      },
      {
        id: 'pneus-estoque',
        label: 'Pneus em Estoque',
        value: String(tireStats.inStock),
        description: 'disponíveis',
        trend: {value: '—', positive: true},
      },
      {
        id: 'pneus-descartados',
        label: 'Pneus Descartados',
        value: String(tireStats.discarded),
        description: 'fora de uso',
        trend: {value: '—', positive: false},
      },
      {
        id: 'pneus-recapados',
        label: 'Pneus Recapados',
        value: String(tireStats.inRetread),
        description: 'com recapagem',
        trend: {value: '—', positive: true},
      },
      {
        id: 'pneus-km-medio',
        label: 'KM Médio Pneus',
        value: `${tireStats.averageKm.toLocaleString('pt-BR')} km`,
        description: 'vida útil percorrida',
        trend: {value: '—', positive: true},
      },
      {
        id: 'pneus-custo-km',
        label: 'Custo por KM (Pneus)',
        value: formatCurrency(tireStats.averageCostPerKm, currency),
        description: 'média da frota',
        trend: {value: '—', positive: false},
      },
      {
        id: 'pneus-troca-proxima',
        label: 'Próximos para Troca',
        value: String(tireStats.replacementDue),
        description: 'sulco ou vida útil baixa',
        trend: {value: '—', positive: false},
      },
      {
        id: 'manutencoes-total',
        label: 'Total de Manutenções',
        value: String(maintenanceStats.total),
        description: 'registros de manutenção',
        trend: {value: '—', positive: true},
      },
      {
        id: 'manutencoes-preventivas',
        label: 'Preventivas',
        value: String(maintenanceStats.preventive),
        description: 'manutenções preventivas',
        trend: {value: '—', positive: true},
      },
      {
        id: 'manutencoes-correctivas',
        label: 'Corretivas',
        value: String(maintenanceStats.corrective),
        description: 'manutenções corretivas',
        trend: {value: '—', positive: false},
      },
      {
        id: 'manutencoes-emergencia',
        label: 'Emergenciais',
        value: String(maintenanceStats.emergency),
        description: 'manutenções de emergência',
        trend: {value: '—', positive: false},
      },
      {
        id: 'manutencoes-custo-total',
        label: 'Custo Total Manutenção',
        value: formatCurrency(maintenanceStats.totalCost, currency),
        description: 'gasto acumulado',
        trend: {value: '—', positive: false},
      },
      {
        id: 'manutencoes-tempo-parado',
        label: 'Tempo Médio Parado',
        value: `${maintenanceStats.averageDowntimeHours.toLocaleString('pt-BR')} h`,
        description: 'downtime médio',
        trend: {value: '—', positive: false},
      },
      {
        id: 'manutencoes-veiculos-indisponiveis',
        label: 'Veículos Indisponíveis',
        value: String(maintenanceStats.unavailableVehicles),
        description: 'em manutenção',
        trend: {value: '—', positive: false},
      },
      {
        id: 'manutencoes-agendamentos-atrasados',
        label: 'Agendamentos Atrasados',
        value: String(maintenanceStats.overdueSchedules),
        description: 'requer atenção',
        trend: {value: '—', positive: false},
      },
      {
        id: 'receita',
        label: 'Receitas',
        value: formatCurrency(financialStats.revenue, currency),
        description: 'receitas consolidadas',
        trend: formatTrend(financialStats.marginPercent),
      },
      {
        id: 'despesas',
        label: 'Despesas',
        value: formatCurrency(financialStats.expenses, currency),
        description: 'despesas operacionais',
        trend: {value: '—', positive: false},
      },
      {
        id: 'lucro',
        label: 'Lucro Operacional',
        value: formatCurrency(financialStats.operatingProfit, currency),
        description: 'receitas − despesas',
        trend: formatTrend(financialStats.marginPercent),
      },
      {
        id: 'fluxo-caixa',
        label: 'Fluxo de Caixa',
        value: formatCurrency(financialStats.cashFlow, currency),
        description: 'entradas e saídas pagas',
        trend: {value: '—', positive: financialStats.cashFlow >= 0},
      },
      {
        id: 'ebitda',
        label: 'EBITDA',
        value: formatCurrency(financialStats.ebitda, currency),
        description: 'estrutura preparada',
        trend: {value: '—', positive: financialStats.ebitda >= 0},
      },
      {
        id: 'margem',
        label: 'Margem',
        value: `${financialStats.marginPercent.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%`,
        description: 'margem operacional',
        trend: formatTrend(financialStats.marginPercent),
      },
      {
        id: 'custo-km',
        label: 'Custo por KM',
        value: formatCurrency(financialStats.costPerKm, currency),
        description: 'custo médio por km rodado',
        trend: {value: '—', positive: false},
      },
      {
        id: 'receita-km',
        label: 'Receita por KM',
        value: tripStats.totalKm > 0
          ? formatCurrency(financialStats.revenue / tripStats.totalKm, currency)
          : formatCurrency(0, currency),
        description: 'receita / km rodado',
        trend: {value: '—', positive: true},
      },
      {
        id: 'lucro-km',
        label: 'Lucro por KM',
        value: tripStats.totalKm > 0
          ? formatCurrency(financialStats.operatingProfit / tripStats.totalKm, currency)
          : formatCurrency(0, currency),
        description: 'lucro / km rodado',
        trend: {value: '—', positive: financialStats.operatingProfit >= 0},
      },
    ],
    charts: [
      {
        id: 'receita-despesas',
        title: 'Receita x Despesas',
        description: 'Comparativo mensal dos últimos 12 meses',
      },
      {
        id: 'custos-categoria',
        title: 'Custos por Categoria',
        description: 'Distribuição de custos operacionais',
      },
      {
        id: 'fluxo-mensal',
        title: 'Fluxo Mensal',
        description: 'Entradas e saídas consolidadas por mês',
      },
    ],
    alerts: [],
    activities: [],
    upcomingDue: [],
    rankings: {
      postos: fuelStats.topStations.map((station, index) => ({
        id: `station-${index}`,
        name: station.stationName,
        value: `${station.refuelCount} abast.`,
        subtitle: formatCurrency(station.totalSpent, currency),
      })),
      veiculos: financialStats.topVehicles.length > 0
        ? financialStats.topVehicles.map((vehicle, index) => ({
            id: vehicle.vehicleId || `vehicle-${index}`,
            name: vehicle.vehiclePlate || 'Veículo',
            value: formatCurrency(vehicle.totalCost, currency),
            subtitle: 'custo financeiro total',
          }))
        : maintenanceStats.topVehicles.map((vehicle, index) => ({
            id: vehicle.vehicleId || `vehicle-${index}`,
            name: vehicle.vehiclePlate || 'Veículo',
            value: formatCurrency(vehicle.totalCost, currency),
            subtitle: 'custo total de manutenção',
          })),
      marcas: financialStats.topCategories.length > 0
        ? financialStats.topCategories.map((category, index) => ({
            id: category.categoryId || `category-${index}`,
            name: category.categoryName,
            value: formatCurrency(category.totalAmount, currency),
            subtitle: 'top categoria',
          }))
        : fuelStats.topBrands.map((brand, index) => ({
            id: `brand-${index}`,
            name: brand.stationBrand,
            value: `${brand.refuelCount} abast.`,
            subtitle: formatCurrency(brand.totalSpent, currency),
          })),
      centrosCusto: financialStats.topCostCenters.map((center, index) => ({
        id: center.costCenterId || `center-${index}`,
        name: center.costCenterName,
        value: formatCurrency(center.totalAmount, currency),
        subtitle: 'centro de custo',
      })),
      viagens: financialStats.topTrips.map((trip, index) => ({
        id: trip.tripId || `trip-${index}`,
        name: trip.tripNumber,
        value: formatCurrency(trip.profit, currency),
        subtitle: `receita ${formatCurrency(trip.totalRevenue, currency)}`,
      })),
    },
  };
}
