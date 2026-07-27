import {describe, expect, it} from 'vitest';

import type {NavGroup} from '@/types/global/navigation';

import {
  nextExclusiveOpenId,
  readOpenGroupId,
} from '../use-sidebar-accordion';

const groups = [
  {id: 'dashboard', label: 'Dashboard', items: [], defaultOpen: true},
  {id: 'cadastros', label: 'Cadastros', items: []},
  {id: 'operacoes', label: 'Operações', items: []},
] as unknown as NavGroup[];

describe('useSidebarAccordion helpers (RC 28.0.3)', () => {
  it('opens only one group when toggling', () => {
    expect(nextExclusiveOpenId('dashboard', 'operacoes')).toBe('operacoes');
    expect(nextExclusiveOpenId('operacoes', 'operacoes')).toBeNull();
  });

  it('reads modern string storage', () => {
    expect(readOpenGroupId(groups, JSON.stringify('cadastros'))).toBe(
      'cadastros',
    );
  });

  it('migrates legacy map storage to a single open group', () => {
    const legacy = JSON.stringify({
      dashboard: true,
      cadastros: true,
      operacoes: false,
    });
    expect(readOpenGroupId(groups, legacy)).toBe('dashboard');
  });

  it('falls back to defaultOpen when storage is empty', () => {
    expect(readOpenGroupId(groups, null)).toBe('dashboard');
  });
});
