import {describe, expect, it} from 'vitest';

import {isValidPlate} from '@/features/vehicles/utils/vehicle-format';

import {
  HML_BRANCHES,
  HML_COST_CENTERS,
  HML_CUSTOMERS,
  HML_DRIVERS,
  HML_EMPLOYEES,
  HML_POSITIONS,
  HML_ROUTES,
  HML_SUPPLIERS,
  HML_VEHICLES,
  assertHmlTripBusyUniqueness,
  assertHmlTripOdometerSequence,
  buildHmlFuelDefinitions,
  buildHmlMaintenanceDefinitions,
  buildHmlTireDefinitions,
  buildHmlTripDefinitions,
  buildHmlVehicleOdometerAfterTrips,
  getHmlCatalogCounts,
  hmlBucketedDaysAgo,
  type HmlTripDef,
} from '../catalog';
import {
  countExpectedFinancialEntriesCreated,
  countExpectedTripFreightFinancialEntries,
} from '../expected-plan';
import {
  HML_AUTHORIZED_COMPANY_ID,
  HML_COMPANY_SLUG,
  HML_COUNTS,
  HML_REQUIRED_PLAN_SLUG,
  HML_TRIP_BUSY_STATUSES,
} from '../constants';
import {assertFictitiousDocuments, isValidCnpj, isValidCpf, makeInvalidCnpj, makeInvalidCpf} from '../documents';
import {
  assertHmlWriteContext,
  assertUniqueHmlMembership,
  assertUniqueHmlTargetCompany,
} from '../guards';
import {
  assertHmlCatalogInvariants,
  assertHmlZodPayloads,
  assertVolumeFitsProfessionalPlan,
  buildOfflinePlanSummary,
} from '../validators';

describe('homologacao seed — documents', () => {
  it('gera CPF/CNPJ com dígito verificador inválido', () => {
    for (let i = 1; i <= 20; i += 1) {
      const cpf = makeInvalidCpf(i);
      const cnpj = makeInvalidCnpj(i);
      expect(cpf).toHaveLength(11);
      expect(cnpj).toHaveLength(14);
      expect(isValidCpf(cpf)).toBe(false);
      expect(isValidCnpj(cnpj)).toBe(false);
    }
  });

  it('rejeita documentos com dígito verificador válido no assert', () => {
    // Monta um CPF válido artificialmente (só para o teste negativo).
    const base9 = '123456789';
    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(base9[i]) * (10 - i);
    let d1 = (sum * 10) % 11;
    if (d1 === 10) d1 = 0;
    sum = 0;
    const withD1 = `${base9}${d1}`;
    for (let i = 0; i < 10; i += 1) sum += Number(withD1[i]) * (11 - i);
    let d2 = (sum * 10) % 11;
    if (d2 === 10) d2 = 0;
    const validCpf = `${base9}${d1}${d2}`;
    expect(isValidCpf(validCpf)).toBe(true);

    expect(() =>
      assertFictitiousDocuments({
        cpfs: [validCpf],
        cnpjs: [],
      }),
    ).toThrow(/dígito verificador/);
  });
});

describe('homologacao seed — catalog', () => {
  it('mantém invariantes e payloads Zod', () => {
    expect(() => assertHmlCatalogInvariants()).not.toThrow();
    expect(() => assertHmlZodPayloads()).not.toThrow();
    expect(() => assertVolumeFitsProfessionalPlan()).not.toThrow();
  });

  it('mira a empresa e o plano corretos', () => {
    const plan = buildOfflinePlanSummary('dry-run');
    expect(plan.companySlug).toBe(HML_COMPANY_SLUG);
    expect(plan.requiredPlan).toBe(HML_REQUIRED_PLAN_SLUG);
    expect(HML_COMPANY_SLUG).toBe('primeira-empresa');
    expect(HML_REQUIRED_PLAN_SLUG).toBe('professional');
  });

  it('respeita volumes do plano Professional', () => {
    expect(HML_VEHICLES.length).toBe(HML_COUNTS.vehicles);
    expect(HML_VEHICLES.length).toBeLessThanOrEqual(50);
    expect(HML_BRANCHES.length + 1).toBeLessThanOrEqual(10);
    expect(HML_DRIVERS.length).toBe(10);
    expect(HML_CUSTOMERS.length).toBe(5);
    expect(HML_SUPPLIERS.length).toBe(6);
  });

  it('usa placas Mercosul válidas e únicas com prefixo HML', () => {
    const plates = HML_VEHICLES.map((v) => v.plate);
    expect(new Set(plates).size).toBe(plates.length);
    for (const plate of plates) {
      expect(plate.startsWith('HML')).toBe(true);
      expect(isValidPlate(plate)).toBe(true);
    }
  });

  it('não reutiliza nomes/CPFs entre motoristas e funcionários', () => {
    const driverNames = new Set(HML_DRIVERS.map((d) => d.name));
    const overlap = HML_EMPLOYEES.filter((e) => driverNames.has(e.name));
    expect(overlap).toHaveLength(0);

    const cpfs = [...HML_DRIVERS.map((d) => d.cpf), ...HML_EMPLOYEES.map((e) => e.cpf)];
    expect(new Set(cpfs).size).toBe(cpfs.length);
  });

  it('classifica fornecedores posto/oficina/pneus', () => {
    expect(HML_SUPPLIERS.some((s) => s.categories.includes('posto'))).toBe(true);
    expect(HML_SUPPLIERS.some((s) => s.categories.includes('oficina'))).toBe(true);
    expect(HML_SUPPLIERS.some((s) => s.categories.includes('pneus'))).toBe(true);
    expect(
      HML_SUPPLIERS.every(
        (s) => !(s.categories.includes('posto') && s.categories.includes('oficina')),
      ),
    ).toBe(true);
  });

  it('gera rotas com cliente e lead time ≥ 1', () => {
    for (const route of HML_ROUTES) {
      expect(HML_CUSTOMERS.some((c) => c.key === route.customerKey)).toBe(true);
      expect(route.leadTimeDays).toBeGreaterThanOrEqual(1);
    }
  });

  it('gera viagens com status e unicidade busy', () => {
    const trips = buildHmlTripDefinitions();
    expect(trips).toHaveLength(HML_COUNTS.trips);
    expect(trips.filter((t) => t.status === 'completed')).toHaveLength(12);
    expect(trips.filter((t) => t.status === 'in_progress')).toHaveLength(3);
    expect(trips.filter((t) => t.status === 'planned')).toHaveLength(3);
    expect(trips.filter((t) => t.status === 'cancelled')).toHaveLength(2);
    expect(() => assertHmlTripBusyUniqueness(trips)).not.toThrow();

    const busy = new Set<string>(HML_TRIP_BUSY_STATUSES);
    const vehicleBusy = trips.filter((t) => busy.has(t.status)).map((t) => t.vehicleKey);
    const driverBusy = trips.filter((t) => busy.has(t.status)).map((t) => t.driverKey);
    expect(new Set(vehicleBusy).size).toBe(vehicleBusy.length);
    expect(new Set(driverBusy).size).toBe(driverBusy.length);
  });

  it('calcula odômetros determinísticos sem regressão em veículos reutilizados', () => {
    const now = new Date(Date.UTC(2026, 9, 21));
    const trips = buildHmlTripDefinitions(HML_COUNTS.trips, now);
    expect(() => assertHmlTripOdometerSequence(trips)).not.toThrow();

    const completedByVehicle = new Map<string, HmlTripDef[]>();
    for (const trip of trips.filter((item) => item.status === 'completed')) {
      const list = completedByVehicle.get(trip.vehicleKey) ?? [];
      list.push(trip);
      completedByVehicle.set(trip.vehicleKey, list);
    }

    const reused = [...completedByVehicle.entries()].filter(([, list]) => list.length >= 2);
    expect(reused.length).toBeGreaterThan(0);

    for (const [vehicleKey, list] of reused) {
      const vehicle = HML_VEHICLES.find((item) => item.key === vehicleKey)!;
      expect(list[0]!.initialOdometerKm).toBe(vehicle.initialOdometerKm);
      for (let i = 0; i < list.length; i += 1) {
        const trip = list[i]!;
        expect(trip.finalOdometerKm).toBe(trip.initialOdometerKm + trip.distanceKm);
        if (i > 0) {
          expect(trip.initialOdometerKm).toBe(list[i - 1]!.finalOdometerKm);
          expect(trip.initialOdometerKm).toBeGreaterThanOrEqual(
            list[i - 1]!.initialOdometerKm,
          );
        }
      }
    }

    // Regressão específica do abort parcial: t011 no mesmo veículo de t001.
    const t001 = trips.find((trip) => trip.key === 't001')!;
    const t011 = trips.find((trip) => trip.key === 't011')!;
    expect(t001.vehicleKey).toBe(t011.vehicleKey);
    expect(t001.status).toBe('completed');
    expect(t011.status).toBe('completed');
    expect(t001.finalOdometerKm).toBe(40480);
    expect(t011.initialOdometerKm).toBe(t001.finalOdometerKm);
    expect(t011.initialOdometerKm).toBeGreaterThan(t001.initialOdometerKm);
  });

  it('reproduz o plano de odômetros para a mesma data de referência', () => {
    const now = new Date(Date.UTC(2026, 9, 21));
    const first = buildHmlTripDefinitions(HML_COUNTS.trips, now);
    const second = buildHmlTripDefinitions(HML_COUNTS.trips, now);
    expect(second).toEqual(first);
    expect(countExpectedTripFreightFinancialEntries(first)).toBe(
      first.filter((trip) => trip.status === 'completed' && trip.freight > 0).length,
    );
    expect(countExpectedFinancialEntriesCreated()).toBeGreaterThan(
      countExpectedTripFreightFinancialEntries(first),
    );
  });

  it('aborta com erro claro quando a sequência de odômetros é inválida', () => {
    const base = buildHmlTripDefinitions(
      HML_COUNTS.trips,
      new Date(Date.UTC(2026, 9, 21)),
    );
    const first = base.find((trip) => trip.key === 't001')!;
    const second = base.find((trip) => trip.key === 't011')!;
    expect(first.vehicleKey).toBe(second.vehicleKey);

    const invalid: HmlTripDef[] = [
      first,
      {
        ...second,
        // Simula o bug antigo: reusa o KM estático do catálogo após completed.
        initialOdometerKm: first.initialOdometerKm,
        finalOdometerKm: first.initialOdometerKm + second.distanceKm,
      },
    ];

    expect(() => assertHmlTripOdometerSequence(invalid)).toThrow(
      /odômetro inicial regressivo|abaixo do último hodômetro/i,
    );
  });

  it('mantém odômetro crescente por veículo nos abastecimentos e ≥ pós-viagens', () => {
    const trips = buildHmlTripDefinitions();
    const afterTrips = buildHmlVehicleOdometerAfterTrips(trips);
    const fuel = buildHmlFuelDefinitions();
    expect(fuel).toHaveLength(HML_COUNTS.fuelRecords);
    const byVehicle = new Map<string, typeof fuel>();
    for (const record of fuel) {
      const list = byVehicle.get(record.vehicleKey) ?? [];
      list.push(record);
      byVehicle.set(record.vehicleKey, list);
    }
    for (const [vehicleKey, records] of byVehicle) {
      const floor = afterTrips.get(vehicleKey) ?? 0;
      const sorted = [...records].sort((a, b) => b.daysAgo - a.daysAgo);
      for (let i = 0; i < sorted.length; i += 1) {
        expect(sorted[i]!.odometerKm).toBeGreaterThanOrEqual(floor);
        if (i > 0) {
          expect(sorted[i]!.odometerKm).toBeGreaterThanOrEqual(sorted[i - 1]!.odometerKm);
        }
      }
    }
  });

  it('gera manutenções e pneus coerentes', () => {
    expect(buildHmlMaintenanceDefinitions()).toHaveLength(HML_COUNTS.maintenanceRecords);
    expect(buildHmlTireDefinitions()).toHaveLength(HML_COUNTS.tires);
  });

  it('distribui datas no bucket 20/20/60', () => {
    const now = new Date(Date.UTC(2026, 9, 19));
    const samples = Array.from({length: 20}, (_, i) => hmlBucketedDaysAgo(i + 1, 20, now));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(1);
    expect(samples.some((d) => d <= 19)).toBe(true);
    expect(samples.some((d) => d > 30)).toBe(true);
  });

  it('expõe contagens estáveis no resumo', () => {
    const counts = getHmlCatalogCounts();
    expect(counts.vehicles).toBe(10);
    expect(counts.trips).toBe(20);
    expect(counts.branches).toBe(2);
    expect(HML_COST_CENTERS).toHaveLength(3);
    expect(HML_POSITIONS).toHaveLength(2);
  });
});

describe('homologacao seed — plan limits contract', () => {
  it('HML_COUNTS vem de constants (catalog não reexporta)', async () => {
    const catalogModule = await import('../catalog');
    expect(Object.prototype.hasOwnProperty.call(catalogModule, 'HML_COUNTS')).toBe(
      false,
    );
    expect(HML_COUNTS).toBeDefined();
    expect(HML_COUNTS.vehicles).toBe(10);
  });

  it('getPlanCatalog mapeia max_vehicles do RPC para maxVehicles', async () => {
    const {getPlanCatalog} = await import('@/features/master/plans/queries/plans');
    const supabase = {
      rpc: async () => ({
        data: [
          {
            slug: 'professional',
            name: 'Plano Professional',
            description: 'test',
            price_monthly: 299,
            price_yearly: 2990,
            max_users: 25,
            max_vehicles: 50,
            max_branches: 10,
            enabled_modules: ['fleet'],
          },
        ],
        error: null,
      }),
    };

    const plans = await getPlanCatalog(supabase as never);
    expect(plans).toHaveLength(1);
    expect(plans[0]?.slug).toBe('professional');
    expect(plans[0]?.maxVehicles).toBe(50);
    expect(plans[0]?.maxUsers).toBe(25);
    expect(plans[0]?.maxBranches).toBe(10);
  });
});

describe('homologacao seed — company membership resolution', () => {
  const targetCompany = {
    id: HML_AUTHORIZED_COMPANY_ID,
    slug: HML_COMPANY_SLUG,
    status: 'active',
    provision_status: 'completed',
    settings: {plan_slug: HML_REQUIRED_PLAN_SLUG},
  };

  const otherCompany = {
    id: 'company-outra',
    slug: 'outra-empresa',
    status: 'active',
    provision_status: 'completed',
    settings: {plan_slug: 'free'},
  };

  it('seleciona a única empresa-alvo sem fallback para outra', () => {
    // A query em resolveHmlSeedContext já filtra por slug; o helper só aceita 1 linha.
    const selected = assertUniqueHmlTargetCompany([targetCompany]);
    expect(selected.id).toBe(HML_AUTHORIZED_COMPANY_ID);
    expect(selected.slug).toBe(HML_COMPANY_SLUG);
    expect(selected.id).not.toBe(otherCompany.id);
    expect(() =>
      assertUniqueHmlTargetCompany([targetCompany, otherCompany]),
    ).toThrow(/múltiplas empresas/);
  });

  it('aborta quando a empresa-alvo não existe', () => {
    expect(() => assertUniqueHmlTargetCompany([])).toThrow(
      /empresa "primeira-empresa" não encontrada/,
    );
  });

  it('aborta quando há múltiplas empresas com o mesmo slug-alvo', () => {
    expect(() =>
      assertUniqueHmlTargetCompany([
        targetCompany,
        {...targetCompany, id: 'company-primeira-dup'},
      ]),
    ).toThrow(/múltiplas empresas com slug "primeira-empresa"/);
  });

  it('aborta sem vínculo ativo na empresa-alvo (sem fallback para outra)', () => {
    expect(() => assertUniqueHmlMembership([])).toThrow(
      /sem vínculo ativo.*primeira-empresa/,
    );
  });

  it('seleciona o vínculo único de primeira-empresa e ignora ambiguidade zero', () => {
    const membership = assertUniqueHmlMembership([
      {
        company_id: HML_AUTHORIZED_COMPANY_ID,
        profile_id: 'profile-1',
        role_id: 'role-sa',
        default_branch_id: null,
      },
    ]);
    expect(membership.company_id).toBe(HML_AUTHORIZED_COMPANY_ID);
  });

  it('aborta com múltiplos vínculos ativos na mesma empresa-alvo', () => {
    expect(() =>
      assertUniqueHmlMembership([
        {
          company_id: HML_AUTHORIZED_COMPANY_ID,
          profile_id: 'profile-1',
          role_id: 'role-sa',
          default_branch_id: null,
        },
        {
          company_id: HML_AUTHORIZED_COMPANY_ID,
          profile_id: 'profile-1',
          role_id: 'role-admin',
          default_branch_id: null,
        },
      ]),
    ).toThrow(/múltiplos vínculos ativos.*primeira-empresa/);
  });

  it('resolveHmlSeedContext ignora membership em outra empresa e usa o slug-alvo', async () => {
    const profileId = 'profile-1';
    const calls: string[] = [];

    const supabase = {
      from(table: string) {
        calls.push(`from:${table}`);
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.eq = (column: string, value: unknown) => {
          calls.push(`eq:${table}.${column}=${String(value)}`);
          return chain;
        };
        chain.is = self;
        chain.in = self;
        chain.maybeSingle = async () => {
          if (table === 'branches') {
            return {data: {id: 'hq-1'}, error: null};
          }
          return {data: null, error: null};
        };
        // Terminal thenable for awaited query builders
        chain.then = (
          resolve: (value: {data: unknown; error: null}) => unknown,
        ) => {
          if (table === 'companies') {
            return Promise.resolve(
              resolve({data: [targetCompany], error: null}),
            );
          }
          if (table === 'company_members') {
            // Só devolve vínculo da empresa-alvo (query filtra company_id).
            return Promise.resolve(
              resolve({
                data: [
                  {
                    company_id: targetCompany.id,
                    profile_id: profileId,
                    role_id: 'role-sa',
                    default_branch_id: null,
                  },
                ],
                error: null,
              }),
            );
          }
          return Promise.resolve(resolve({data: [], error: null}));
        };
        return chain;
      },
      async rpc(name: string, args?: {p_company_id?: string}) {
        calls.push(`rpc:${name}:${args?.p_company_id ?? ''}`);
        if (name === 'is_company_super_admin') {
          expect(args?.p_company_id).toBe(targetCompany.id);
          return {data: true, error: null};
        }
        if (name === 'get_plan_catalog') {
          return {
            data: [
              {
                slug: 'professional',
                name: 'Plano Professional',
                description: 'test',
                price_monthly: 299,
                price_yearly: 2990,
                max_users: 25,
                max_vehicles: 50,
                max_branches: 10,
                enabled_modules: ['fleet'],
              },
            ],
            error: null,
          };
        }
        return {data: null, error: {message: `rpc inesperado: ${name}`}};
      },
    };

    const {resolveHmlSeedContext} = await import('../guards');
    const context = await resolveHmlSeedContext(supabase as never, profileId);

    expect(context.companyId).toBe(targetCompany.id);
    expect(context.companySlug).toBe(HML_COMPANY_SLUG);
    expect(context.planSlug).toBe(HML_REQUIRED_PLAN_SLUG);
    expect(calls.some((c) => c === `eq:companies.slug=${HML_COMPANY_SLUG}`)).toBe(
      true,
    );
    expect(calls.some((c) => c === `eq:company_members.company_id=${targetCompany.id}`)).toBe(
      true,
    );
    // Não há limit(1) genérico sobre qualquer membership.
    expect(calls.some((c) => c.startsWith('eq:company_members.company_id=company-outra'))).toBe(
      false,
    );
  });

  it('assertHmlWriteContext recusa contexto de outra empresa', () => {
    expect(() =>
      assertHmlWriteContext({
        companyId: 'company-outra',
        profileId: 'profile-1',
        companySlug: 'outra-empresa',
        planSlug: HML_REQUIRED_PLAN_SLUG,
        hqBranchId: 'hq-1',
        maxVehicles: 50,
        maxUsers: 25,
        maxBranches: 10,
      }),
    ).toThrow(/companyId diverge do UUID autorizado/);
  });

  it('assertHmlWriteContext recusa slug correto com UUID divergente', () => {
    expect(() =>
      assertHmlWriteContext({
        companyId: '00000000-0000-0000-0000-000000000000',
        profileId: 'profile-1',
        companySlug: HML_COMPANY_SLUG,
        planSlug: HML_REQUIRED_PLAN_SLUG,
        hqBranchId: 'hq-1',
        maxVehicles: 50,
        maxUsers: 25,
        maxBranches: 10,
      }),
    ).toThrow(/companyId diverge do UUID autorizado/);
  });

  it('assertHmlWriteContext aceita slug + UUID autorizados', () => {
    expect(() =>
      assertHmlWriteContext({
        companyId: HML_AUTHORIZED_COMPANY_ID,
        profileId: 'profile-1',
        companySlug: HML_COMPANY_SLUG,
        planSlug: HML_REQUIRED_PLAN_SLUG,
        hqBranchId: 'hq-1',
        maxVehicles: 50,
        maxUsers: 25,
        maxBranches: 10,
      }),
    ).not.toThrow();
  });

  it('resolveHmlSeedContext aborta com slug-alvo e UUID divergente', async () => {
    const wrongIdCompany = {
      ...targetCompany,
      id: '00000000-0000-0000-0000-000000000000',
    };
    const supabase = {
      from(table: string) {
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.eq = self;
        chain.is = self;
        chain.then = (
          resolve: (value: {data: unknown; error: null}) => unknown,
        ) => {
          if (table === 'companies') {
            return Promise.resolve(resolve({data: [wrongIdCompany], error: null}));
          }
          return Promise.resolve(resolve({data: [], error: null}));
        };
        return chain;
      },
      async rpc() {
        return {data: null, error: {message: 'rpc não deveria ser chamado'}};
      },
    };

    const {resolveHmlSeedContext} = await import('../guards');
    await expect(
      resolveHmlSeedContext(supabase as never, 'profile-1'),
    ).rejects.toThrow(/company_id resolvido diverge do UUID autorizado/);
  });

  it('resolveHmlSeedContext aborta sem Super Admin na empresa-alvo', async () => {
    const supabase = {
      from(table: string) {
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.select = self;
        chain.eq = self;
        chain.is = self;
        chain.then = (
          resolve: (value: {data: unknown; error: null}) => unknown,
        ) => {
          if (table === 'companies') {
            return Promise.resolve(resolve({data: [targetCompany], error: null}));
          }
          if (table === 'company_members') {
            return Promise.resolve(
              resolve({
                data: [
                  {
                    company_id: targetCompany.id,
                    profile_id: 'profile-1',
                    role_id: 'role-consulta',
                    default_branch_id: null,
                  },
                ],
                error: null,
              }),
            );
          }
          return Promise.resolve(resolve({data: [], error: null}));
        };
        return chain;
      },
      async rpc(name: string) {
        if (name === 'is_company_super_admin') {
          return {data: false, error: null};
        }
        return {data: null, error: null};
      },
    };

    const {resolveHmlSeedContext} = await import('../guards');
    await expect(resolveHmlSeedContext(supabase as never, 'profile-1')).rejects.toThrow(
      /não é Super Admin/,
    );
  });
});
