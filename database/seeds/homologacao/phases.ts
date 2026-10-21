import type {SupabaseClient} from '@supabase/supabase-js';

import {createAccountsPayable} from '@/features/accounts-payable/queries/accounts-payable';
import {markAccountsPayablePaid} from '@/features/accounts-payable/queries/accounts-payable';
import {createAccountsPayableSchema} from '@/features/accounts-payable/validation';
import {createAccountsReceivable} from '@/features/accounts-receivable/queries/accounts-receivable';
import {markAccountsReceivableReceived} from '@/features/accounts-receivable/queries/accounts-receivable';
import {createAccountsReceivableSchema} from '@/features/accounts-receivable/validation';
import {createCostCenter} from '@/features/cost-centers/queries/cost-centers';
import {listCostCentersForSelect} from '@/features/cost-centers/queries/cost-centers';
import {createCostCenterSchema} from '@/features/cost-centers/validation';
import {createCustomerAddress, createCustomerContact, createCustomer} from '@/features/customers/queries/customers';
import {createCustomerContract} from '@/features/customers/queries/contracts';
import {
  createCustomerContractSchema,
  createCustomerSchema,
  customerAddressSchema,
  customerContactSchema,
} from '@/features/customers/validation';
import {createDriver} from '@/features/drivers/queries/drivers';
import {createDriverSchema} from '@/features/drivers/validation';
import {listFinancialCategories} from '@/features/financial/queries/financial-entries';
import {createFinancialEntry} from '@/features/financial/queries/financial-entries';
import {createFinancialEntrySchema} from '@/features/financial/validation';
import {createFuelRecord} from '@/features/fuel/queries/fuel-records';
import {createFuelRecordSchema} from '@/features/fuel/validation';
import {
  createMaintenancePart,
  createMaintenanceRecord,
  createMaintenanceService,
} from '@/features/maintenance/queries/maintenance-records';
import {
  createMaintenancePartSchema,
  createMaintenanceRecordSchema,
  createMaintenanceServiceSchema,
} from '@/features/maintenance/validation';
import {createBranch} from '@/features/organization/branches/queries/branches';
import {createBranchSchema} from '@/features/organization/branches/validation';
import {createEmployee} from '@/features/payroll/queries/employees';
import {createPayrollExpense} from '@/features/payroll/queries/payroll-expenses';
import {createPosition, listPositions} from '@/features/payroll/queries/positions';
import {syncPayrollFinancialEntry} from '@/features/payroll/services/payroll-financial.service';
import {normalizeCompetence} from '@/features/payroll/utils/competence';
import {
  createEmployeeSchema,
  createPayrollExpenseSchema,
  createPositionSchema,
} from '@/features/payroll/validation';
import {createRoute} from '@/features/routes/queries/routes';
import {createRouteSchema} from '@/features/routes/validation';
import {createSupplier} from '@/features/suppliers/queries/suppliers';
import {createSupplierSchema} from '@/features/suppliers/validation';
import {
  createTire,
  createTireInspection,
  createTireMovement,
  createTireRecap,
} from '@/features/tires/queries/tires';
import {
  createTireInspectionSchema,
  createTireMovementSchema,
  createTireRecapSchema,
  createTireSchema,
} from '@/features/tires/validation';
import {
  cancelTrip,
  completeTrip,
  createTrip,
  createTripExpense,
  createTripOccurrence,
  createTripStop,
  startTrip,
  upsertTripChecklist,
} from '@/features/trips/queries/trips';
import {
  cancelTripSchema,
  completeTripSchema,
  createTripExpenseSchema,
  createTripOccurrenceSchema,
  createTripSchema,
  createTripStopSchema,
  upsertTripChecklistSchema,
} from '@/features/trips/validation';
import {createVehicle} from '@/features/vehicles/queries/vehicles';
import {createVehicleSchema} from '@/features/vehicles/validation';

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
  buildHmlFuelDefinitions,
  buildHmlMaintenanceDefinitions,
  buildHmlTireDefinitions,
  buildHmlTripDefinitions,
  formatCompetence,
  hmlNotes,
  isoDaysAgo,
  isoDaysAgoDate,
  subtractMonths,
} from './catalog';
import {HML_COUNTS} from './constants';
import {buildHmlExpectedPlan} from './expected-plan';
import {
  HmlExecutionTracker,
  HmlPhaseAbortError,
  formatPhaseAbortMessage,
  throwUnexpectedPhaseAbort,
} from './execution-report';
import {assertHmlWriteContext, assertSystemFinancialPrerequisites} from './guards';
import {
  createManifest,
  getManifestId,
  hasManifestEntry,
  trackManifest,
} from './manifest';
import {
  assertFuelFinancialSync,
  assertMaintenanceFinancialSync,
  assertTireFinancialSync,
  assertTripCompletedFinancialSync,
  runAndAssertPayrollFinancialSync,
} from './require-financial-sync';
import type {HmlExecutionReport, HmlManifest, HmlSeedContext} from './types';

export interface HmlIdMaps {
  branches: Map<string, string>;
  costCenters: Map<string, string>;
  positions: Map<string, string>;
  customers: Map<string, string>;
  suppliers: Map<string, string>;
  drivers: Map<string, string>;
  vehicles: Map<string, string>;
  routes: Map<string, string>;
  employees: Map<string, string>;
  trips: Map<string, string>;
  tires: Map<string, string>;
  categories: Map<string, string>;
}

/**
 * Grava a massa HML na empresa do contexto (já validada como `primeira-empresa`).
 *
 * Não há transação/rollback global nem resume cross-run.
 * Integrações financeiras de combustível/manutenção/pneus/viagens/folha são
 * obrigatórias na carga HML (hooks de domínio reutilizados; sem lançamentos substitutos).
 *
 * Ver PARTIAL_FAILURE.md.
 */
export async function runHomologacaoPhases(
  supabase: SupabaseClient,
  context: HmlSeedContext,
): Promise<{
  manifest: HmlManifest;
  created: Record<string, number>;
  executionReport: HmlExecutionReport;
}> {
  assertHmlWriteContext(context);
  await assertSystemFinancialPrerequisites(supabase, context.companyId);

  const expected = buildHmlExpectedPlan();
  const tracker = new HmlExecutionTracker();
  tracker.setExpectedPlan(expected);

  /** Fase em andamento — usada no catch; nunca inferir de phaseSummaries.at(-1). */
  let currentPhase = 'init';

  let manifest = createManifest(context.companyId, context.companySlug);
  const created: Record<string, number> = {};
  const bump = (key: string) => {
    created[key] = (created[key] ?? 0) + 1;
  };

  const persistFinancialManifest: Parameters<
    typeof assertFuelFinancialSync
  >[5] = (input) => {
    manifest = trackManifest(manifest, {
      entity: input.entity,
      key: input.key,
      id: input.id,
      phase: input.phase,
      table: 'financial_entries',
      kind: 'financial_integration',
      operation: 'sync',
      relatedIds: input.relatedIds,
      expectedFinancialEntries: input.expectedFinancialEntries,
    });
  };

  const maps: HmlIdMaps = {
    branches: new Map([['hq', context.hqBranchId]]),
    costCenters: new Map(),
    positions: new Map(),
    customers: new Map(),
    suppliers: new Map(),
    drivers: new Map(),
    vehicles: new Map(),
    routes: new Map(),
    employees: new Map(),
    trips: new Map(),
    tires: new Map(),
    categories: new Map(),
  };

  const trackOk = (input: {
    phase: string;
    entity: string;
    key: string;
    table: string;
    kind: 'primary' | 'auxiliary' | 'status_update' | 'financial_integration';
    operation?: 'insert' | 'update' | 'sync';
    id: string;
    relatedIds?: string[];
    expectedFinancialEntries?: number;
    createdKey?: string;
  }) => {
    tracker.recordSuccess({
      phase: input.phase,
      entity: input.entity,
      key: input.key,
      table: input.table,
      kind: input.kind,
      operation: input.operation ?? 'insert',
      id: input.id,
      relatedIds: input.relatedIds,
      expectedFinancialEntries: input.expectedFinancialEntries,
    });
    manifest = trackManifest(manifest, {
      entity: input.entity,
      key: input.key,
      id: input.id,
      phase: input.phase,
      table: input.table,
      kind: input.kind,
      operation: input.operation ?? 'insert',
      relatedIds: input.relatedIds,
      expectedFinancialEntries: input.expectedFinancialEntries,
    });
    if (input.createdKey) bump(input.createdKey);
  };

  const requireId = (
    phase: string,
    relationship: string,
    key: string,
    id: string | undefined | null,
  ): string => {
    if (!id) {
      tracker.abort(
        phase,
        `Relacionamento obrigatório ausente: ${relationship} (chave ${key}).`,
      );
    }
    return id as string;
  };

  try {
    // --- Referências de sistema ---
    currentPhase = 'prerequisites';
    const categories = await listFinancialCategories(supabase, context.companyId);
    for (const category of categories) {
      if (category.slug) {
        maps.categories.set(category.slug, category.id);
      }
    }

    const systemCenters = await listCostCentersForSelect(supabase, context.companyId);
    for (const center of systemCenters) {
      maps.costCenters.set(center.code.toUpperCase(), center.id);
    }

    const systemPositions = await listPositions(supabase, context.companyId, {activeOnly: true});
    for (const position of systemPositions) {
      if (position.code) {
        maps.positions.set(position.code.toUpperCase(), position.id);
      }
    }

    // --- Filiais ---
    currentPhase = 'branches';
    for (const branch of HML_BRANCHES) {
      const existing = getManifestId(manifest, 'branch', branch.key);
      if (existing) {
        maps.branches.set(branch.key, existing);
        continue;
      }
      const row = await createBranch(
        supabase,
        context.companyId,
        createBranchSchema.parse({
          code: branch.code,
          name: branch.name,
          isHeadquarters: false,
          phone: '0012345678',
        }),
        context.profileId,
      );
      maps.branches.set(branch.key, row.id);
      trackOk({
        phase: 'branches',
        entity: 'branch',
        key: branch.key,
        table: 'branches',
        kind: 'primary',
        id: row.id,
        createdKey: 'branches',
      });
    }

    // --- Centros e cargos customizados ---
    currentPhase = 'cost_centers';
    for (const center of HML_COST_CENTERS) {
      const existing = getManifestId(manifest, 'cost_center', center.key);
      if (existing) {
        maps.costCenters.set(center.code, existing);
        continue;
      }
      const row = await createCostCenter(
        supabase,
        context.companyId,
        createCostCenterSchema.parse({
          code: center.code,
          name: center.name,
          description: center.description,
        }),
        context.profileId,
      );
      maps.costCenters.set(center.code, row.id);
      trackOk({
        phase: 'cost_centers',
        entity: 'cost_center',
        key: center.key,
        table: 'cost_centers',
        kind: 'primary',
        id: row.id,
        createdKey: 'costCenters',
      });
    }

    currentPhase = 'positions';
    for (const position of HML_POSITIONS) {
      const existing = getManifestId(manifest, 'position', position.key);
      if (existing) {
        maps.positions.set(position.code, existing);
        continue;
      }
      const positionInput = createPositionSchema.parse({
        code: position.code,
        name: position.name,
        description: position.description,
        status: 'active',
      });
      if (!positionInput.code) {
        throw new Error(`Código de cargo HML inválido: ${position.key}.`);
      }
      const row = await createPosition(
        supabase,
        context.companyId,
        {...positionInput, code: positionInput.code},
        context.profileId,
      );
      maps.positions.set(position.code, row.id);
      maps.positions.set(position.key, row.id);
      trackOk({
        phase: 'positions',
        entity: 'position',
        key: position.key,
        table: 'positions',
        kind: 'primary',
        id: row.id,
        createdKey: 'positions',
      });
    }

    // --- Fornecedores ---
    currentPhase = 'suppliers';
    for (const supplier of HML_SUPPLIERS) {
      const existing = getManifestId(manifest, 'supplier', supplier.key);
      if (existing) {
        maps.suppliers.set(supplier.key, existing);
        continue;
      }
      const row = await createSupplier(
        supabase,
        context.companyId,
        createSupplierSchema.parse({
          corporateName: supplier.corporateName,
          tradeName: supplier.corporateName,
          document: supplier.document,
          categories: supplier.categories,
          city: supplier.city,
          state: supplier.state,
          phone: '0012345678',
          email: `fornecedor.${supplier.key}@example.com`,
          active: true,
          notes: hmlNotes('supplier', supplier.key),
        }),
        context.profileId,
      );
      maps.suppliers.set(supplier.key, row.id);
      trackOk({
        phase: 'suppliers',
        entity: 'supplier',
        key: supplier.key,
        table: 'suppliers',
        kind: 'primary',
        id: row.id,
        createdKey: 'suppliers',
      });
    }

    // --- Clientes (+ endereço / contato / contrato) ---
    currentPhase = 'customers';
    for (const customer of HML_CUSTOMERS) {
      let customerId = getManifestId(manifest, 'customer', customer.key);
      if (!customerId) {
        const row = await createCustomer(
          supabase,
          context.companyId,
          createCustomerSchema.parse({
            legalName: customer.legalName,
            tradeName: customer.tradeName,
            taxId: customer.taxId,
            email: customer.email,
            phone: '0012345678',
            customerStatus: 'active',
            segment: 'commercial',
            branchId: maps.branches.get('hq') ?? null,
            notes: hmlNotes('customer', customer.key),
          }),
          context.profileId,
        );
        customerId = row.id;
        trackOk({
          phase: 'customers',
          entity: 'customer',
          key: customer.key,
          table: 'customers',
          kind: 'primary',
          id: customerId,
          createdKey: 'customers',
        });
      }
      maps.customers.set(customer.key, customerId);

      if (customer.withAddress && !hasManifestEntry(manifest, 'customer_address', customer.key)) {
        const address = await createCustomerAddress(
          supabase,
          context.companyId,
          customerId,
          customerAddressSchema.parse({
            addressType: 'headquarters',
            label: 'SEDE',
            street: 'RUA FICTICIA HOMOL',
            number: '100',
            city: customer.city,
            state: customer.state,
            zipCode: '65000000',
            country: 'BR',
            isPrimary: true,
          }),
          context.profileId,
        );
        trackOk({
          phase: 'customers',
          entity: 'customer_address',
          key: customer.key,
          table: 'customer_addresses',
          kind: 'auxiliary',
          id: address.id,
          createdKey: 'customerAddresses',
        });
      }

      if (customer.withContact && !hasManifestEntry(manifest, 'customer_contact', customer.key)) {
        const contact = await createCustomerContact(
          supabase,
          context.companyId,
          customerId,
          customerContactSchema.parse({
            name: `Contato ${customer.key}`,
            jobTitle: 'Compras',
            phone: '00123456789',
            email: `contato.${customer.key}@example.com`,
          }),
          context.profileId,
        );
        trackOk({
          phase: 'customers',
          entity: 'customer_contact',
          key: customer.key,
          table: 'customer_contacts',
          kind: 'auxiliary',
          id: contact.id,
          createdKey: 'customerContacts',
        });
      }

      if (customer.withContract && !hasManifestEntry(manifest, 'customer_contract', customer.key)) {
        const contract = await createCustomerContract(
          supabase,
          context.companyId,
          createCustomerContractSchema.parse({
            customerId,
            contractNumber: `HML-CTR-${customer.key.toUpperCase()}`,
            contractStatus: 'active',
            contractType: 'spot',
            currency: 'BRL',
            startsAt: isoDaysAgoDate(90),
            endsAt: isoDaysAgoDate(-90),
            notes: hmlNotes('contract', customer.key),
            items: Array.from({length: HML_COUNTS.contractItemsPerContract}, (_, index) => ({
              origin: 'SÃO LUÍS/MA',
              destination: customer.city.toUpperCase(),
              freightValue: 2500 + index * 300,
              tollIncluded: false,
              deliveryDays: 2,
            })),
          }),
          context.profileId,
        );
        trackOk({
          phase: 'customers',
          entity: 'customer_contract',
          key: customer.key,
          table: 'customer_contracts',
          kind: 'primary',
          id: contract.id,
          createdKey: 'contracts',
        });
        for (const [index, item] of (contract.items ?? []).entries()) {
          const itemKey = `${customer.key}-item${index + 1}`;
          trackOk({
            phase: 'customers',
            entity: 'customer_contract_item',
            key: itemKey,
            table: 'customer_contract_items',
            kind: 'auxiliary',
            id: item.id,
            createdKey: 'contractItems',
          });
        }
      }
    }

    // --- Veículos ---
    currentPhase = 'vehicles';
    for (const vehicle of HML_VEHICLES) {
      const existing = getManifestId(manifest, 'vehicle', vehicle.key);
      if (existing) {
        maps.vehicles.set(vehicle.key, existing);
        continue;
      }
      const row = await createVehicle(
        supabase,
        context.companyId,
        createVehicleSchema.parse({
          plate: vehicle.plate,
          vehicleType: vehicle.vehicleType,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          fuelType: vehicle.fuelType,
          initialOdometerKm: vehicle.initialOdometerKm,
          assetStatus: 'active',
          branchId: maps.branches.get(vehicle.branchKey) ?? context.hqBranchId,
          notes: hmlNotes('vehicle', vehicle.key),
        }),
        context.profileId,
      );
      maps.vehicles.set(vehicle.key, row.id);
      trackOk({
        phase: 'vehicles',
        entity: 'vehicle',
        key: vehicle.key,
        table: 'vehicles',
        kind: 'primary',
        id: row.id,
        createdKey: 'vehicles',
      });
    }

    // --- Motoristas ---
    currentPhase = 'drivers';
    for (const driver of HML_DRIVERS) {
      const existing = getManifestId(manifest, 'driver', driver.key);
      if (existing) {
        maps.drivers.set(driver.key, existing);
        continue;
      }
      const row = await createDriver(
        supabase,
        context.companyId,
        createDriverSchema.parse({
          name: driver.name,
          cpf: driver.cpf,
          cnhNumber: driver.cnhNumber,
          licenseCategory: driver.licenseCategory,
          licenseExpiresAt: '2030-12-31',
          operationalStatus: 'active',
          phone: '00123456789',
          branchId: maps.branches.get(driver.branchKey) ?? context.hqBranchId,
          notes: hmlNotes('driver', driver.key),
        }),
        context.profileId,
      );
      maps.drivers.set(driver.key, row.id);
      trackOk({
        phase: 'drivers',
        entity: 'driver',
        key: driver.key,
        table: 'drivers',
        kind: 'primary',
        id: row.id,
        createdKey: 'drivers',
      });
    }

    // --- Rotas ---
    currentPhase = 'routes';
    for (const route of HML_ROUTES) {
      const existing = getManifestId(manifest, 'route', route.key);
      if (existing) {
        maps.routes.set(route.key, existing);
        continue;
      }
      const customerId = maps.customers.get(route.customerKey);
      const branchId = maps.branches.get(route.branchKey) ?? context.hqBranchId;
      if (!customerId) throw new Error(`Cliente da rota ${route.key} ausente.`);

      const row = await createRoute(
        supabase,
        context.companyId,
        createRouteSchema.parse({
          name: route.name,
          code: route.code,
          origin: route.origin,
          destination: route.destination,
          plannedDistanceKm: route.distanceKm,
          leadTimeDays: route.leadTimeDays,
          customerId,
          branchId,
          routeType: 'delivery',
          operationalStatus: 'active',
          notes: hmlNotes('route', route.key),
        }),
        context.profileId,
      );
      maps.routes.set(route.key, row.id);
      trackOk({
        phase: 'routes',
        entity: 'route',
        key: route.key,
        table: 'routes',
        kind: 'primary',
        id: row.id,
        createdKey: 'routes',
      });
    }

    // --- Funcionários ---
    currentPhase = 'employees';
    for (const employee of HML_EMPLOYEES) {
      const existing = getManifestId(manifest, 'employee', employee.key);
      if (existing) {
        maps.employees.set(employee.key, existing);
        continue;
      }
      const positionId =
        maps.positions.get(employee.positionKey) ??
        maps.positions.get(HML_POSITIONS.find((p) => p.key === employee.positionKey)?.code ?? '');
      const costCenterId = maps.costCenters.get(employee.costCenterCode);
      if (!positionId || !costCenterId) {
        throw new Error(`Referências inválidas para funcionário ${employee.key}.`);
      }

      const row = await createEmployee(
        supabase,
        context.companyId,
        createEmployeeSchema.parse({
          name: employee.name,
          positionId,
          costCenterId,
          branchId: maps.branches.get(employee.branchKey) ?? context.hqBranchId,
          cpf: employee.cpf,
          email: employee.email,
          phone: '0012345678',
          contractType: 'clt',
          hiredAt: isoDaysAgoDate(400),
          notes: hmlNotes('employee', employee.key),
          status: 'active',
        }),
        context.profileId,
      );
      maps.employees.set(employee.key, row.id);
      trackOk({
        phase: 'employees',
        entity: 'employee',
        key: employee.key,
        table: 'employees',
        kind: 'primary',
        id: row.id,
        createdKey: 'employees',
      });
    }

    // --- Viagens (ciclo oficial) ---
    currentPhase = 'trips';
    const tripDefs = buildHmlTripDefinitions();
    for (const trip of tripDefs) {
      const existing = getManifestId(manifest, 'trip', trip.key);
      if (existing) {
        maps.trips.set(trip.key, existing);
        continue;
      }

      const route = HML_ROUTES.find((item) => item.key === trip.routeKey);
      const vehicle = HML_VEHICLES.find((item) => item.key === trip.vehicleKey);
      if (!route || !vehicle) throw new Error(`Referência inválida na viagem ${trip.key}.`);

      const routeId = maps.routes.get(trip.routeKey);
      const vehicleId = maps.vehicles.get(trip.vehicleKey);
      const driverId = maps.drivers.get(trip.driverKey);
      const customerId = maps.customers.get(trip.customerKey);
      if (!routeId || !vehicleId || !driverId || !customerId) {
        throw new Error(`IDs ausentes para viagem ${trip.key}.`);
      }

      const departedAt = isoDaysAgo(trip.daysAgo);
      const tripRow = await createTrip(
        supabase,
        context.companyId,
        createTripSchema.parse({
          routeId,
          vehicleId,
          driverId,
          customerId,
          branchId: maps.branches.get(vehicle.branchKey) ?? context.hqBranchId,
          origin: route.origin,
          destination: route.destination,
          route: route.name,
          plannedDistanceKm: trip.distanceKm,
          leadTimeMinutes: route.leadTimeDays * 1440,
          initialOdometerKm: trip.initialOdometerKm,
          departedAt,
          actualFreightValue: trip.freight,
          notes: hmlNotes('trip', trip.key),
        }),
        context.profileId,
      );

      const tripId = tripRow.id;
      trackOk({
        phase: 'trips',
        entity: 'trip',
        key: trip.key,
        table: 'trips',
        kind: 'primary',
        id: tripId,
        createdKey: 'trips',
      });

      if (trip.status === 'cancelled') {
        await cancelTrip(
          supabase,
          context.companyId,
          tripId,
          cancelTripSchema.parse({cancellationNotes: hmlNotes('trip-cancel', trip.key)}),
          context.profileId,
        );
        trackOk({
          phase: 'trips',
          entity: 'trip_cancel',
          key: trip.key,
          table: 'trips',
          kind: 'status_update',
          operation: 'update',
          id: tripId,
          createdKey: 'tripCancels',
        });
      } else if (trip.status === 'in_progress' || trip.status === 'completed') {
        await startTrip(supabase, context.companyId, tripId, context.profileId);
        trackOk({
          phase: 'trips',
          entity: 'trip_start',
          key: trip.key,
          table: 'trips',
          kind: 'status_update',
          operation: 'update',
          id: tripId,
          createdKey: 'tripStarts',
        });
        if (trip.status === 'completed') {
          if (trip.finalOdometerKm === null) {
            tracker.abort(
              'trips',
              `Viagem completed ${trip.key} sem finalOdometerKm no plano HML.`,
            );
          }
          const completedAt = isoDaysAgo(Math.max(trip.daysAgo - 1, 0));
          const completed = await completeTrip(
            supabase,
            context.companyId,
            tripId,
            completeTripSchema.parse({
              completedAt,
              finalOdometerKm: trip.finalOdometerKm,
            }),
            context.profileId,
          );
          trackOk({
            phase: 'trips',
            entity: 'trip_complete',
            key: trip.key,
            table: 'trips',
            kind: 'status_update',
            operation: 'update',
            id: tripId,
            createdKey: 'tripCompletes',
          });
          await assertTripCompletedFinancialSync(
            supabase,
            context.companyId,
            completed,
            tracker,
            trip.key,
            persistFinancialManifest,
          );
        }
      }

      maps.trips.set(trip.key, tripId);
    }

    // --- Despesas / paradas / ocorrências / checklists de viagem ---
    currentPhase = 'trip_children';
    const completedTripKeys = tripDefs.filter((t) => t.status === 'completed').map((t) => t.key);
    if (completedTripKeys.length === 0) {
      tracker.abort('trip_children', 'Nenhuma viagem completed disponível para filhos obrigatórios.');
    }
    for (let index = 0; index < HML_COUNTS.tripExpenses; index += 1) {
      const key = `te${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'trip_expense', key)) continue;
      const tripKey = completedTripKeys[index % completedTripKeys.length]!;
      const tripId = requireId('trip_children', 'tripId→trip_expense', key, maps.trips.get(tripKey));
      const expense = await createTripExpense(
        supabase,
        context.companyId,
        createTripExpenseSchema.parse({
          tripId,
          expenseType: (['toll', 'food', 'parking', 'other'] as const)[index % 4],
          amount: 50 + index * 15,
          description: hmlNotes('trip_expense', key),
        }),
        context.profileId,
      );
      trackOk({
        phase: 'trip_children',
        entity: 'trip_expense',
        key,
        table: 'trip_expenses',
        kind: 'auxiliary',
        id: expense.id,
        createdKey: 'tripExpenses',
      });
    }

    for (let index = 0; index < HML_COUNTS.tripStops; index += 1) {
      const key = `ts${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'trip_stop', key)) continue;
      const tripKey = completedTripKeys[index % completedTripKeys.length]!;
      const tripId = requireId('trip_children', 'tripId→trip_stop', key, maps.trips.get(tripKey));
      const stop = await createTripStop(
        supabase,
        context.companyId,
        createTripStopSchema.parse({
          tripId,
          clientName: `Parada HML ${index + 1}`,
          stopDate: isoDaysAgoDate(5 + index),
          stoppedMinutes: 30,
          notes: hmlNotes('trip_stop', key),
        }),
        context.profileId,
      );
      trackOk({
        phase: 'trip_children',
        entity: 'trip_stop',
        key,
        table: 'trip_stops',
        kind: 'auxiliary',
        id: stop.id,
        createdKey: 'tripStops',
      });
    }

    for (let index = 0; index < HML_COUNTS.tripOccurrences; index += 1) {
      const key = `to${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'trip_occurrence', key)) continue;
      const tripKey = completedTripKeys[index % completedTripKeys.length]!;
      const tripId = requireId(
        'trip_children',
        'tripId→trip_occurrence',
        key,
        maps.trips.get(tripKey),
      );
      const occurrence = await createTripOccurrence(
        supabase,
        context.companyId,
        createTripOccurrenceSchema.parse({
          tripId,
          occurrenceType: 'delay',
          description: hmlNotes('trip_occurrence', key),
          occurredAt: isoDaysAgo(5 + index),
        }),
        context.profileId,
      );
      trackOk({
        phase: 'trip_children',
        entity: 'trip_occurrence',
        key,
        table: 'trip_occurrences',
        kind: 'auxiliary',
        id: occurrence.id,
        createdKey: 'tripOccurrences',
      });
    }

    for (let index = 0; index < HML_COUNTS.tripChecklists; index += 1) {
      const key = `tc${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'trip_checklist', key)) continue;
      const tripKey = completedTripKeys[index % completedTripKeys.length]!;
      const tripId = requireId(
        'trip_children',
        'tripId→trip_checklist',
        key,
        maps.trips.get(tripKey),
      );
      const checklist = await upsertTripChecklist(
        supabase,
        context.companyId,
        upsertTripChecklistSchema.parse({
          tripId,
          tiresOk: true,
          headlightsOk: true,
          brakesOk: true,
          documentationOk: true,
          fuelOk: true,
        }),
        context.profileId,
      );
      trackOk({
        phase: 'trip_children',
        entity: 'trip_checklist',
        key,
        table: 'trip_checklists',
        kind: 'auxiliary',
        id: checklist.id,
        createdKey: 'tripChecklists',
      });
    }

    // --- Abastecimentos ---
    currentPhase = 'fuel';
    for (const fuel of buildHmlFuelDefinitions()) {
      if (hasManifestEntry(manifest, 'fuel', fuel.key)) continue;
      const vehicleId = maps.vehicles.get(fuel.vehicleKey);
      const driverId = maps.drivers.get(fuel.driverKey);
      const supplierId = maps.suppliers.get(fuel.supplierKey);
      const supplier = HML_SUPPLIERS.find((s) => s.key === fuel.supplierKey);
      if (!vehicleId || !driverId || !supplierId || !supplier) {
        tracker.abort(
          'fuel',
          `Referências ausentes para abastecimento ${fuel.key} (vehicle/driver/supplier).`,
        );
      }
      const fuelSupplier = supplier!;

      const row = await createFuelRecord(
        supabase,
        context.companyId,
        createFuelRecordSchema.parse({
          vehicleId,
          driverId,
          supplierId,
          stationName: fuelSupplier.corporateName,
          city: fuelSupplier.city,
          state: fuelSupplier.state,
          fueledAt: isoDaysAgo(fuel.daysAgo),
          fuelType: 'diesel',
          quantityLiters: fuel.liters,
          pricePerLiter: fuel.pricePerLiter,
          totalAmount: fuel.totalAmount,
          odometerKm: fuel.odometerKm,
          paymentType: fuel.paymentType,
          paymentDueDate: fuel.paymentType === 'credit' ? isoDaysAgoDate(fuel.daysAgo - 15) : null,
          installmentCount: fuel.paymentType === 'credit' ? 2 : 1,
          installmentIntervalDays: 30,
          notes: hmlNotes('fuel', fuel.key),
          branchId: context.hqBranchId,
        }),
        context.profileId,
      );
      trackOk({
        phase: 'fuel',
        entity: 'fuel',
        key: fuel.key,
        table: 'fuel_records',
        kind: 'primary',
        id: row.id,
        createdKey: 'fuelRecords',
      });
      await assertFuelFinancialSync(
        supabase,
        context.companyId,
        row,
        tracker,
        fuel.key,
        persistFinancialManifest,
      );
    }

    // --- Manutenções ---
    currentPhase = 'maintenance';
    const maintenanceDefs = buildHmlMaintenanceDefinitions();
    const maintenanceIds: string[] = [];
    for (const record of maintenanceDefs) {
      let id = getManifestId(manifest, 'maintenance', record.key);
      if (!id) {
        const vehicleId = maps.vehicles.get(record.vehicleKey);
        const supplierId = maps.suppliers.get(record.supplierKey);
        const supplier = HML_SUPPLIERS.find((s) => s.key === record.supplierKey);
        if (!vehicleId || !supplierId || !supplier) {
          tracker.abort(
            'maintenance',
            `Referências ausentes para manutenção ${record.key}.`,
          );
        }
        const maintenanceSupplier = supplier!;

        const {record: createdRecord, financialSyncWarning} = await createMaintenanceRecord(
          supabase,
          context.companyId,
          createMaintenanceRecordSchema.parse({
            vehicleId,
            supplierId,
            supplier: maintenanceSupplier.corporateName,
            maintenanceType: record.maintenanceType,
            priority: record.maintenanceType === 'emergency' ? 'high' : 'medium',
            maintenanceStatus: record.maintenanceStatus,
            openedAt: isoDaysAgo(record.daysAgo),
            completedAt:
              record.maintenanceStatus === 'completed'
                ? isoDaysAgo(Math.max(record.daysAgo - 2, 0))
                : null,
            finalAmount: record.amount,
            paymentType: record.paymentType,
            paymentDueDate:
              record.paymentType === 'credit' ? isoDaysAgoDate(record.daysAgo - 20) : null,
            installmentCount: record.paymentType === 'credit' ? 2 : 1,
            installmentIntervalDays: 30,
            notes: hmlNotes('maintenance', record.key),
            branchId: context.hqBranchId,
          }),
          context.profileId,
        );
        id = createdRecord.id;
        trackOk({
          phase: 'maintenance',
          entity: 'maintenance',
          key: record.key,
          table: 'maintenance_records',
          kind: 'primary',
          id,
          createdKey: 'maintenanceRecords',
        });
        if (financialSyncWarning) {
          // Domínio engoliu falha; assert abaixo aborta se FE não persistiram.
        }
        await assertMaintenanceFinancialSync(
          supabase,
          context.companyId,
          createdRecord,
          tracker,
          record.key,
          persistFinancialManifest,
        );
      }
      maintenanceIds.push(id);
    }

    if (maintenanceIds.length === 0) {
      tracker.abort('maintenance', 'Nenhuma manutenção disponível para peças/serviços obrigatórios.');
    }

    for (let index = 0; index < HML_COUNTS.maintenanceParts; index += 1) {
      const key = `mp${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'maintenance_part', key)) continue;
      const maintenanceRecordId = requireId(
        'maintenance',
        'maintenanceRecordId→maintenance_part',
        key,
        maintenanceIds[index % maintenanceIds.length],
      );
      const part = await createMaintenancePart(
        supabase,
        context.companyId,
        createMaintenancePartSchema.parse({
          maintenanceRecordId,
          name: `Peça HML ${index + 1}`,
          quantity: 1,
          unitPrice: 150 + index * 40,
        }),
        context.profileId,
        {branchId: context.hqBranchId},
      );
      trackOk({
        phase: 'maintenance',
        entity: 'maintenance_part',
        key,
        table: 'maintenance_parts',
        kind: 'auxiliary',
        id: part.id,
        createdKey: 'maintenanceParts',
      });
    }

    for (let index = 0; index < HML_COUNTS.maintenanceServices; index += 1) {
      const key = `ms${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'maintenance_service', key)) continue;
      const maintenanceRecordId = requireId(
        'maintenance',
        'maintenanceRecordId→maintenance_service',
        key,
        maintenanceIds[index % maintenanceIds.length],
      );
      const service = await createMaintenanceService(
        supabase,
        context.companyId,
        createMaintenanceServiceSchema.parse({
          maintenanceRecordId,
          description: `Serviço HML ${index + 1}`,
          hours: 2,
          amount: 200 + index * 50,
        }),
        context.profileId,
        {branchId: context.hqBranchId},
      );
      trackOk({
        phase: 'maintenance',
        entity: 'maintenance_service',
        key,
        table: 'maintenance_services',
        kind: 'auxiliary',
        id: service.id,
        createdKey: 'maintenanceServices',
      });
    }

    // --- Pneus ---
    currentPhase = 'tires';
    const tireDefs = buildHmlTireDefinitions();
    for (const tire of tireDefs) {
      let tireId = getManifestId(manifest, 'tire', tire.key);
      if (!tireId) {
        const vehicleId = maps.vehicles.get(tire.vehicleKey);
        const supplierId = maps.suppliers.get(tire.supplierKey);
        const supplier = HML_SUPPLIERS.find((s) => s.key === tire.supplierKey);
        if (!vehicleId || !supplierId || !supplier) {
          tracker.abort('tires', `Referências ausentes para pneu ${tire.key}.`);
        }
        const tireSupplier = supplier!;

        const row = await createTire(
          supabase,
          context.companyId,
          createTireSchema.parse({
            vehicleId,
            supplierId,
            supplier: tireSupplier.corporateName,
            brand: tire.brand,
            model: tire.model,
            tireSize: '295/80R22.5',
            purchaseDate: isoDaysAgoDate(tire.daysAgo),
            purchaseValue: tire.purchaseValue,
            tireStatus: 'in_stock',
            paymentType: tire.purchaseValue > 2800 ? 'credit' : 'cash',
            paymentDueDate:
              tire.purchaseValue > 2800 ? isoDaysAgoDate(tire.daysAgo - 25) : null,
            installmentCount: tire.purchaseValue > 2800 ? 2 : 1,
            installmentIntervalDays: 30,
            notes: hmlNotes('tire', tire.key),
            branchId: context.hqBranchId,
          }),
          context.profileId,
        );
        tireId = row.id;
        maps.tires.set(tire.key, tireId);
        trackOk({
          phase: 'tires',
          entity: 'tire',
          key: tire.key,
          table: 'tires',
          kind: 'primary',
          id: tireId,
          createdKey: 'tires',
        });
        await assertTireFinancialSync(
          supabase,
          context.companyId,
          row,
          tracker,
          tire.key,
          persistFinancialManifest,
        );
      } else {
        maps.tires.set(tire.key, tireId);
      }
    }

    for (let index = 0; index < HML_COUNTS.tireMovements; index += 1) {
      const key = `tm${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'tire_movement', key)) continue;
      const tire = tireDefs[index % tireDefs.length]!;
      const tireId = requireId('tires', 'tireId→tire_movement', key, maps.tires.get(tire.key));
      const vehicleId = requireId(
        'tires',
        'vehicleId→tire_movement',
        key,
        maps.vehicles.get(tire.vehicleKey),
      );
      const movement = await createTireMovement(
        supabase,
        context.companyId,
        createTireMovementSchema.parse({
          tireId,
          movementType: 'install',
          vehicleId,
          position: 'rear_right_outer',
          installedAt: isoDaysAgo(tire.daysAgo),
          notes: hmlNotes('tire_movement', key),
        }),
        context.profileId,
      );
      trackOk({
        phase: 'tires',
        entity: 'tire_movement',
        key,
        table: 'tire_movements',
        kind: 'auxiliary',
        id: movement.id,
        createdKey: 'tireMovements',
      });
    }

    for (let index = 0; index < HML_COUNTS.tireInspections; index += 1) {
      const key = `ti${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'tire_inspection', key)) continue;
      const tire = tireDefs[index % tireDefs.length]!;
      const tireId = requireId('tires', 'tireId→tire_inspection', key, maps.tires.get(tire.key));
      const inspection = await createTireInspection(
        supabase,
        context.companyId,
        createTireInspectionSchema.parse({
          tireId,
          inspectedAt: isoDaysAgo(Math.max(tire.daysAgo - 3, 1)),
          treadDepthMm: 8,
          pressurePsi: 110,
          wearLevel: 'good',
          notes: hmlNotes('tire_inspection', key),
        }),
        context.profileId,
      );
      trackOk({
        phase: 'tires',
        entity: 'tire_inspection',
        key,
        table: 'tire_inspections',
        kind: 'auxiliary',
        id: inspection.id,
        createdKey: 'tireInspections',
      });
    }

    if (HML_COUNTS.tireRecaps > 0 && !hasManifestEntry(manifest, 'tire_recap', 'tr01')) {
      const tire = tireDefs[0];
      if (!tire) {
        tracker.abort('tires', 'Catálogo de pneus vazio; recape obrigatório indisponível.');
      }
      const tireId = requireId('tires', 'tireId→tire_recap', 'tr01', maps.tires.get(tire.key));
      const recap = await createTireRecap(
        supabase,
        context.companyId,
        createTireRecapSchema.parse({
          tireId,
          recappedAt: isoDaysAgoDate(Math.max(tire.daysAgo - 10, 1)),
          amount: 450,
          notes: hmlNotes('tire_recap', 'tr01'),
        }),
        context.profileId,
      );
      trackOk({
        phase: 'tires',
        entity: 'tire_recap',
        key: 'tr01',
        table: 'tire_recaps',
        kind: 'auxiliary',
        id: recap.id,
        createdKey: 'tireRecaps',
      });
    }

    // --- Folha ---
    currentPhase = 'payroll';
    const now = new Date();
    const payrollPeople = [
      {personKind: 'driver' as const, personKey: 'd01', expenseType: 'salario' as const, amount: 3500, costCenterCode: 'OPERACIONAL'},
      {personKind: 'driver' as const, personKey: 'd02', expenseType: 'salario' as const, amount: 3400, costCenterCode: 'OPERACIONAL'},
      ...HML_EMPLOYEES.map((employee) => ({
        personKind: 'employee' as const,
        personKey: employee.key,
        expenseType: 'salario' as const,
        amount: 2800,
        costCenterCode: employee.costCenterCode,
        positionKey: employee.positionKey,
      })),
    ];

    for (let monthOffset = 0; monthOffset < HML_COUNTS.payrollCompetences; monthOffset += 1) {
      const competenceDate = subtractMonths(now, monthOffset);
      const competence = normalizeCompetence(formatCompetence(competenceDate));
      if (!competence) throw new Error('Competência HML inválida.');

      for (const item of payrollPeople) {
        const key = `p-${monthOffset}-${item.personKey}-${item.expenseType}`;
        if (hasManifestEntry(manifest, 'payroll', key)) continue;

        const personId =
          item.personKind === 'driver'
            ? maps.drivers.get(item.personKey)
            : maps.employees.get(item.personKey);
        const costCenterId = maps.costCenters.get(item.costCenterCode);
        if (!personId || !costCenterId) {
          tracker.abort('payroll', `Referências ausentes para folha ${key}.`);
        }

        const expenseStatus = monthOffset === 0 ? 'pending' : 'paid';
        const dueDate = isoDaysAgoDate(monthOffset * 28 + 5);
        const row = await createPayrollExpense(
          supabase,
          context.companyId,
          createPayrollExpenseSchema.parse({
            personKind: item.personKind,
            personId,
            positionId:
              item.personKind === 'employee' && 'positionKey' in item
                ? maps.positions.get(item.positionKey) ?? null
                : null,
            costCenterId,
            branchId: context.hqBranchId,
            competence,
            expenseType: item.expenseType,
            expenseStatus,
            amount: item.amount,
            paymentMethod: 'transferencia',
            dueDate,
            paidAt: expenseStatus === 'paid' ? dueDate : null,
            notes: hmlNotes('payroll', key),
            confirmDuplicate: true,
          }),
          context.profileId,
        );
        trackOk({
          phase: 'payroll',
          entity: 'payroll',
          key,
          table: 'payroll_expenses',
          kind: 'primary',
          id: row.id,
          createdKey: 'payrollExpenses',
        });
        await runAndAssertPayrollFinancialSync(
          supabase,
          context.companyId,
          row.id,
          () => syncPayrollFinancialEntry(supabase, context.companyId, row, context.profileId),
          tracker,
          key,
          persistFinancialManifest,
        );
      }
    }

    // --- Contas a pagar / receber ---
    const categoryOutros = maps.categories.get('outros');
    const categoryReceitas = maps.categories.get('receitas');
    const categoryImpostos = maps.categories.get('impostos');
    const costCenterAdmin = maps.costCenters.get('ADMINISTRATIVO') ?? maps.costCenters.get('OPERACIONAL');
    if (!categoryOutros || !categoryReceitas || !categoryImpostos || !costCenterAdmin) {
      throw new Error('Categorias/centros financeiros padrão ausentes.');
    }

    currentPhase = 'accounts_payable';
    const supplierList = [...maps.suppliers.entries()];
    for (let index = 0; index < HML_COUNTS.accountsPayable; index += 1) {
      const key = `ap${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'accounts_payable', key)) continue;
      const [supplierKey, supplierId] = supplierList[index % supplierList.length];
      const supplier = HML_SUPPLIERS.find((s) => s.key === supplierKey);
      const amount = 500 + index * 75;
      const entryDate = isoDaysAgoDate(20 + index);
      const dueDate = isoDaysAgoDate(index < 2 ? -5 : 10 - index);
      const entry = await createAccountsPayable(
        supabase,
        context.companyId,
        createAccountsPayableSchema.parse({
          supplierId,
          supplier: supplier?.corporateName ?? 'FORNECEDOR HML',
          categoryId: index % 2 === 0 ? categoryOutros : categoryImpostos,
          costCenterId: costCenterAdmin,
          description: hmlNotes('accounts_payable', key),
          notes: hmlNotes('accounts_payable', key),
          amount,
          entryDate,
          dueDate,
        }),
        context.profileId,
      );

      trackOk({
        phase: 'accounts_payable',
        entity: 'accounts_payable',
        key,
        table: 'financial_entries',
        kind: 'primary',
        id: entry.id,
        createdKey: 'accountsPayable',
      });

      if (index >= 7) {
        await markAccountsPayablePaid(
          supabase,
          context.companyId,
          entry.id,
          context.profileId,
          {paidAt: isoDaysAgoDate(1), paidAmount: amount},
        );
        trackOk({
          phase: 'accounts_payable',
          entity: 'accounts_payable_paid',
          key,
          table: 'financial_entries',
          kind: 'status_update',
          operation: 'update',
          id: entry.id,
          createdKey: 'accountsPayablePaid',
        });
      }
    }

    currentPhase = 'accounts_receivable';
    for (let index = 0; index < HML_COUNTS.accountsReceivable; index += 1) {
      const key = `ar${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'accounts_receivable', key)) continue;
      const customer = HML_CUSTOMERS[index % HML_CUSTOMERS.length];
      const amount = 800 + index * 90;
      const entry = await createAccountsReceivable(
        supabase,
        context.companyId,
        createAccountsReceivableSchema.parse({
          client: customer.tradeName,
          categoryId: categoryReceitas,
          costCenterId: costCenterAdmin,
          description: hmlNotes('accounts_receivable', key),
          notes: hmlNotes('accounts_receivable', key),
          amount,
          entryDate: isoDaysAgoDate(25 + index),
          dueDate: isoDaysAgoDate(index < 2 ? -3 : 12 - index),
        }),
        context.profileId,
      );

      trackOk({
        phase: 'accounts_receivable',
        entity: 'accounts_receivable',
        key,
        table: 'financial_entries',
        kind: 'primary',
        id: entry.id,
        createdKey: 'accountsReceivable',
      });

      if (index >= 7) {
        await markAccountsReceivableReceived(
          supabase,
          context.companyId,
          entry.id,
          context.profileId,
          {paidAt: isoDaysAgoDate(1), paidAmount: amount},
        );
        trackOk({
          phase: 'accounts_receivable',
          entity: 'accounts_receivable_received',
          key,
          table: 'financial_entries',
          kind: 'status_update',
          operation: 'update',
          id: entry.id,
          createdKey: 'accountsReceivableReceived',
        });
      }
    }

    // --- Lançamentos manuais (10 receitas + 10 despesas) ---
    currentPhase = 'manual_financial';
    for (let index = 0; index < HML_COUNTS.manualFinancialEntries; index += 1) {
      const key = `fe${String(index + 1).padStart(2, '0')}`;
      if (hasManifestEntry(manifest, 'financial_entry', key)) continue;
      const isRevenue = index < 10;
      const amount = 300 + index * 40;
      const entry = await createFinancialEntry(
        supabase,
        context.companyId,
        createFinancialEntrySchema.parse({
          entryType: isRevenue ? 'revenue' : 'expense',
          entryStatus: index % 3 === 0 ? 'paid' : 'pending',
          amount,
          entryDate: isoDaysAgoDate(15 + (index % 40)),
          dueDate: isRevenue || index % 3 === 0 ? null : isoDaysAgoDate(5 - (index % 10)),
          categoryId: isRevenue ? categoryReceitas : categoryOutros,
          costCenterId: costCenterAdmin,
          description: hmlNotes('financial_entry', key),
          notes: hmlNotes('financial_entry', key),
          client: isRevenue ? HML_CUSTOMERS[index % HML_CUSTOMERS.length].tradeName : null,
          supplier: !isRevenue
            ? HML_SUPPLIERS[index % HML_SUPPLIERS.length].corporateName
            : null,
        }),
        context.profileId,
      );
      trackOk({
        phase: 'manual_financial',
        entity: 'financial_entry',
        key,
        table: 'financial_entries',
        kind: 'primary',
        id: entry.id,
        createdKey: 'manualFinancialEntries',
      });
    }

    const executionReport = tracker.toReport();
    if (executionReport.comparison && !executionReport.comparison.ok) {
      tracker.abort(
        'totals',
        `Divergência entre plano e execução: ${executionReport.comparison.divergences
          .map((d) => `${d.metric}(exp=${d.expected},got=${d.executed})`)
          .join(', ')}`,
      );
    }

    return {manifest, created, executionReport};
  } catch (error) {
    if (error instanceof HmlPhaseAbortError) {
      const message = formatPhaseAbortMessage(error.report);
      const enriched = new HmlPhaseAbortError(error.phase, message, error.report);
      throw enriched;
    }
    throwUnexpectedPhaseAbort(currentPhase, error, tracker);
  }
}
