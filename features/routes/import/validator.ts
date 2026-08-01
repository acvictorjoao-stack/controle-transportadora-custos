import {
  normalizeLookupKey,
  parseBooleanFlag,
  parseOptionalInteger,
  parseOptionalNumber,
  summarizePreviewRows,
  worstStatus,
} from '@/features/import';
import type {ImportPreviewRow, ImportRowIssue, ImportRowStatus} from '@/features/import';

import {buildAutoRouteName} from '../utils/route-format';
import type {
  RouteImportLookupMaps,
  RouteImportPayload,
  RouteImportPreviewResult,
  RouteImportRawRow,
} from './types';

function findExistingRouteId(
  maps: RouteImportLookupMaps,
  origin: string,
  destination: string,
  customerId: string,
): string | null {
  const originKey = normalizeLookupKey(origin);
  const destinationKey = normalizeLookupKey(destination);
  const match = maps.existingRoutes.find(
    (route) =>
      route.customerId === customerId &&
      normalizeLookupKey(route.origin) === originKey &&
      normalizeLookupKey(route.destination) === destinationKey,
  );
  return match?.id ?? null;
}

export function validateRouteImportRows(
  rows: RouteImportRawRow[],
  maps: RouteImportLookupMaps,
): RouteImportPreviewResult {
  const previewRows: ImportPreviewRow<RouteImportPayload>[] = rows.map((row) => {
    const issues: ImportRowIssue[] = [];
    let status: ImportRowStatus = 'valid';

    const origin = row.origin.trim();
    const destination = row.destination.trim();
    const customerName = row.customerName.trim();
    const branchName = row.branchName.trim();
    const routeNameRaw = row.routeName.trim();

    if (!origin) {
      issues.push({field: 'origin', message: 'Origem não informada.'});
      status = worstStatus(status, 'invalid');
    }
    if (!destination) {
      issues.push({field: 'destination', message: 'Destino não informado.'});
      status = worstStatus(status, 'invalid');
    }
    if (routeNameRaw.length > 150) {
      issues.push({
        field: 'routeName',
        message: 'Nome da Rota deve ter no máximo 150 caracteres.',
      });
      status = worstStatus(status, 'invalid');
    }

    const customer = customerName
      ? maps.customersByName.get(normalizeLookupKey(customerName))
      : undefined;
    if (!customerName) {
      issues.push({field: 'customerName', message: 'Cliente não informado.'});
      status = worstStatus(status, 'invalid');
    } else if (!customer) {
      issues.push({field: 'customerName', message: 'Cliente inexistente.'});
      status = worstStatus(status, 'invalid');
    }

    const branch = branchName
      ? maps.branchesByName.get(normalizeLookupKey(branchName))
      : undefined;
    if (!branchName) {
      issues.push({field: 'branchName', message: 'Filial não informada.'});
      status = worstStatus(status, 'invalid');
    } else if (!branch) {
      issues.push({field: 'branchName', message: 'Filial não encontrada.'});
      status = worstStatus(status, 'invalid');
    }

    const leadTimeDays = parseOptionalInteger(row.leadTimeDays);
    if (leadTimeDays === null) {
      issues.push({field: 'leadTimeDays', message: 'Lead Time obrigatório.'});
      status = worstStatus(status, 'invalid');
    } else if (!Number.isFinite(leadTimeDays)) {
      issues.push({
        field: 'leadTimeDays',
        message: 'Lead Time deve ser um número inteiro.',
      });
      status = worstStatus(status, 'invalid');
    } else if (leadTimeDays < 1) {
      issues.push({
        field: 'leadTimeDays',
        message: 'Lead Time deve ser maior que zero.',
      });
      status = worstStatus(status, 'invalid');
    }

    const distanceKm = parseOptionalNumber(row.distanceKm);
    if (distanceKm !== null && !Number.isFinite(distanceKm)) {
      issues.push({field: 'distanceKm', message: 'Distância inválida.'});
      status = worstStatus(status, 'invalid');
    } else if (distanceKm !== null && distanceKm < 0) {
      issues.push({field: 'distanceKm', message: 'Distância deve ser maior ou igual a zero.'});
      status = worstStatus(status, 'invalid');
    }

    const active = parseBooleanFlag(row.active, true);
    if (active === null) {
      issues.push({field: 'active', message: 'Situação inválida. Use Sim/Não ou Ativa/Inativa.'});
      status = worstStatus(status, 'invalid');
    }

    const originUpper = origin.toUpperCase();
    const destinationUpper = destination.toUpperCase();
    const resolvedName =
      routeNameRaw ||
      (origin && destination ? buildAutoRouteName(originUpper, destinationUpper) : '');

    const existingRouteId =
      customer && origin && destination
        ? findExistingRouteId(maps, originUpper, destinationUpper, customer.id)
        : null;

    if (existingRouteId) {
      issues.push({
        field: 'existing',
        message: 'Rota já existe (Origem + Destino + Cliente). Será atualizada se confirmado.',
      });
      status = worstStatus(status, 'warning');
    }

    const payload: RouteImportPayload | null =
      status === 'invalid' || !customer || !branch || leadTimeDays == null || !Number.isFinite(leadTimeDays) || active == null
        ? null
        : {
            name: resolvedName,
            origin: originUpper,
            destination: destinationUpper,
            customerId: customer.id,
            customerName: customer.name,
            branchId: branch.id,
            branchName: branch.name,
            plannedDistanceKm: distanceKm != null && Number.isFinite(distanceKm) ? distanceKm : null,
            leadTimeDays,
            operationalStatus: active ? 'active' : 'inactive',
            existingRouteId,
          };

    return {
      rowNumber: row.rowNumber,
      status,
      issues,
      payload,
      display: {
        status,
        routeName: resolvedName || routeNameRaw || '—',
        origin: origin || '—',
        destination: destination || '—',
        customer: customerName || '—',
        branch: branchName || '—',
        leadTimeDays: row.leadTimeDays || '—',
        distanceKm: row.distanceKm || '—',
        issue: issues.map((item) => item.message).join(' '),
      },
    };
  });

  return summarizePreviewRows(previewRows);
}
