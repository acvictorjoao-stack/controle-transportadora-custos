export interface PlanCatalogItem {
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxVehicles: number;
  maxBranches: number;
  enabledModules: string[];
}

export type PlanSlug = string;
