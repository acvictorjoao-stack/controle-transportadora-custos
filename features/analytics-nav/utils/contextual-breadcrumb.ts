import type {BreadcrumbItem} from '@/types/global/navigation';
import {ROUTES} from '@/constants/routes/paths';

import type {AnalyticsContextEntity, SharedAnalyticsFilters} from '../types';
import {buildCrossNavHref, buildSharedAnalyticsUrl} from './shared-filters';

export interface ContextualBreadcrumbInput {
  moduleLabel: string;
  moduleHref: string;
  filters?: SharedAnalyticsFilters;
  trail?: Array<Pick<AnalyticsContextEntity, 'type' | 'id' | 'label'>>;
}

/**
 * Breadcrumb contextual: Dashboard > Módulo > entidade > … (todos clicáveis).
 */
export function buildContextualAnalyticsBreadcrumbs(
  input: ContextualBreadcrumbInput,
): BreadcrumbItem[] {
  const filters = input.filters ?? {};
  const items: BreadcrumbItem[] = [
    {label: 'Dashboard', href: ROUTES.dashboard},
    {
      label: input.moduleLabel,
      href: buildSharedAnalyticsUrl(filters, input.moduleHref),
    },
  ];

  for (const entity of input.trail ?? []) {
    const override: SharedAnalyticsFilters = {};
    let moduleId:
      | 'rentabilidade-clientes'
      | 'rentabilidade-rotas'
      | 'rentabilidade-veiculos'
      | 'rentabilidade-motoristas'
      | 'inteligencia'
      | 'viagens' = 'viagens';

    switch (entity.type) {
      case 'customer':
        override.customerId = entity.id;
        moduleId = 'rentabilidade-clientes';
        break;
      case 'route':
        override.routeId = entity.id;
        moduleId = 'rentabilidade-rotas';
        break;
      case 'vehicle':
        override.vehicleId = entity.id;
        moduleId = 'rentabilidade-veiculos';
        break;
      case 'driver':
        override.driverId = entity.id;
        moduleId = 'rentabilidade-motoristas';
        break;
      case 'branch':
        override.branchId = entity.id;
        moduleId = 'inteligencia';
        break;
      case 'trip':
        items.push({
          label: entity.label,
          href: ROUTES.viagemDetail(entity.id),
        });
        continue;
      default:
        break;
    }

    items.push({
      label: entity.label,
      href: buildCrossNavHref(moduleId, filters, override),
    });
  }

  // Último nível sem href (página atual)
  if (items.length > 0) {
    const last = items[items.length - 1];
    items[items.length - 1] = {label: last.label};
  }

  return items;
}
