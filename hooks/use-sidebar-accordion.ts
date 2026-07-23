'use client';

import * as React from 'react';

import {SIDEBAR_ACCORDION_STORAGE_KEY} from '@/constants/app/sidebar';
import type {NavGroup} from '@/types/global/navigation';

type AccordionState = Record<string, boolean>;

function readAccordionState(groups: NavGroup[]): AccordionState {
  const defaults: AccordionState = {};
  for (const group of groups) {
    defaults[group.id] = group.defaultOpen ?? false;
  }

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = localStorage.getItem(SIDEBAR_ACCORDION_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as AccordionState;
    return {...defaults, ...parsed};
  } catch {
    return defaults;
  }
}

function persistAccordionState(state: AccordionState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIDEBAR_ACCORDION_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Estado aberto/fechado dos grupos da sidebar, persistido em localStorage.
 * Grupos com rota ativa são forçados a abrir quando a rota muda.
 */
export function useSidebarAccordion(
  groups: NavGroup[],
  activeGroupIds: string[],
) {
  const [openMap, setOpenMap] = React.useState<AccordionState>(() =>
    readAccordionState(groups),
  );

  const activeKey = activeGroupIds.slice().sort().join(',');
  const [prevActiveKey, setPrevActiveKey] = React.useState(activeKey);

  if (activeKey !== prevActiveKey) {
    setPrevActiveKey(activeKey);
    setOpenMap((prev) => {
      let changed = false;
      const next = {...prev};

      for (const group of groups) {
        if (!(group.id in next)) {
          next[group.id] = group.defaultOpen ?? false;
          changed = true;
        }
      }

      for (const id of activeGroupIds) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }

  React.useEffect(() => {
    persistAccordionState(openMap);
  }, [openMap]);

  const isOpen = React.useCallback(
    (groupId: string) => openMap[groupId] ?? false,
    [openMap],
  );

  const toggle = React.useCallback((groupId: string) => {
    setOpenMap((prev) => {
      const next = {...prev, [groupId]: !prev[groupId]};
      return next;
    });
  }, []);

  const setOpen = React.useCallback((groupId: string, open: boolean) => {
    setOpenMap((prev) => {
      if (prev[groupId] === open) return prev;
      return {...prev, [groupId]: open};
    });
  }, []);

  return {isOpen, toggle, setOpen};
}
