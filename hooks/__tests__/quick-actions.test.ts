import {describe, expect, it} from 'vitest';

import {getQuickActionAccess} from '@/lib/navigation/quick-actions';

describe('getQuickActionAccess', () => {
  it('hides both actions for read-only members', () => {
    expect(
      getQuickActionAccess(['trips:read', 'financeiro_pagar:read', 'financeiro:read']),
    ).toEqual({canCreateTrip: false, canCreateExpense: false});
  });

  it('requires reading the destination page, not only creating', () => {
    expect(getQuickActionAccess(['trips:create', 'financeiro:create'])).toEqual({
      canCreateTrip: false,
      canCreateExpense: false,
    });
  });

  it('shows Nova Viagem with trips read and create', () => {
    expect(getQuickActionAccess(['trips:read', 'trips:create'])).toEqual({
      canCreateTrip: true,
      canCreateExpense: false,
    });
  });

  it.each(['financeiro_pagar:read', 'financeiro:read'])(
    'shows Nova Despesa with %s and financeiro:create',
    (readPermission) => {
      expect(getQuickActionAccess([readPermission, 'financeiro:create'])).toEqual({
        canCreateTrip: false,
        canCreateExpense: true,
      });
    },
  );

  it('shows both actions for the wildcard', () => {
    expect(getQuickActionAccess(['*'])).toEqual({
      canCreateTrip: true,
      canCreateExpense: true,
    });
  });
});
