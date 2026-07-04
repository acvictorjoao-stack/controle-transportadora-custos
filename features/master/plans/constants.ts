import type {PlanCatalogItem} from './types';

export const DEFAULT_PLAN_SLUG = 'free';

export const FALLBACK_PLANS: PlanCatalogItem[] = [
  {
    slug: 'free',
    name: 'Plano Free',
    description: 'Plano gratuito para transportadoras em fase inicial',
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 3,
    maxVehicles: 5,
    maxBranches: 1,
    enabledModules: ['organization', 'fleet_basic'],
  },
  {
    slug: 'professional',
    name: 'Plano Professional',
    description: 'Plano completo para operações em crescimento',
    priceMonthly: 299,
    priceYearly: 2990,
    maxUsers: 25,
    maxVehicles: 50,
    maxBranches: 10,
    enabledModules: [
      'organization',
      'fleet',
      'operations',
      'financial',
      'costs',
      'reports',
    ],
  },
];
