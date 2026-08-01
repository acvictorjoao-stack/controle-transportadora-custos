import {describe, expect, it} from 'vitest';

import {validateRouteImportRows} from '../validator';
import type {RouteImportLookupMaps, RouteImportRawRow} from '../types';

const maps: RouteImportLookupMaps = {
  customersByName: new Map([
    ['CLIENTE XP', {id: '11111111-1111-4111-8111-111111111111', name: 'Cliente XP'}],
  ]),
  branchesByName: new Map([
    ['MATRIZ', {id: '22222222-2222-4222-8222-222222222222', name: 'Matriz'}],
  ]),
  existingRoutes: [],
};

function row(overrides: Partial<RouteImportRawRow> = {}): RouteImportRawRow {
  return {
    rowNumber: 2,
    routeName: 'Norte 01',
    origin: 'São Luís',
    destination: 'Imperatriz',
    customerName: 'Cliente XP',
    branchName: 'Matriz',
    distanceKm: '300',
    leadTimeDays: '2',
    active: 'Sim',
    ...overrides,
  };
}

describe('validateRouteImportRows (RC 28.1.0)', () => {
  it('accepts a valid row', () => {
    const result = validateRouteImportRows([row()], maps);
    expect(result.validCount).toBe(1);
    expect(result.rows[0]?.payload?.leadTimeDays).toBe(2);
  });

  it('rejects missing lead time', () => {
    const result = validateRouteImportRows([row({leadTimeDays: ''})], maps);
    expect(result.invalidCount).toBe(1);
    expect(result.rows[0]?.issues[0]?.message).toBe('Lead Time obrigatório.');
  });

  it('rejects lead time <= 0', () => {
    const result = validateRouteImportRows([row({leadTimeDays: '0'})], maps);
    expect(result.invalidCount).toBe(1);
    expect(result.rows[0]?.issues.some((i) => i.message.includes('maior que zero'))).toBe(
      true,
    );
  });

  it('rejects unknown customer', () => {
    const result = validateRouteImportRows([row({customerName: 'Inexistente'})], maps);
    expect(result.rows[0]?.issues.some((i) => i.message === 'Cliente inexistente.')).toBe(
      true,
    );
  });

  it('rejects unknown branch', () => {
    const result = validateRouteImportRows([row({branchName: 'X'})], maps);
    expect(result.rows[0]?.issues.some((i) => i.message === 'Filial não encontrada.')).toBe(
      true,
    );
  });

  it('rejects missing origin/destination', () => {
    const result = validateRouteImportRows(
      [row({origin: '', destination: ''})],
      maps,
    );
    const messages = result.rows[0]?.issues.map((i) => i.message) ?? [];
    expect(messages).toContain('Origem não informada.');
    expect(messages).toContain('Destino não informado.');
  });

  it('marks existing route as warning', () => {
    const withExisting: RouteImportLookupMaps = {
      ...maps,
      existingRoutes: [
        {
          id: 'r1',
          origin: 'SÃO LUÍS',
          destination: 'IMPERATRIZ',
          customerId: '11111111-1111-4111-8111-111111111111',
        },
      ],
    };
    const result = validateRouteImportRows([row()], withExisting);
    expect(result.warningCount).toBe(1);
    expect(result.rows[0]?.payload?.existingRouteId).toBe('r1');
  });
});
