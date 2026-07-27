'use client';

import * as React from 'react';

import {SIDEBAR_ACCORDION_STORAGE_KEY} from '@/constants/app/sidebar';
import type {NavGroup} from '@/types/global/navigation';

/**
 * Lê o grupo aberto do localStorage.
 * Aceita formato novo (string id) e legado (mapa JSON de booleans).
 */
export function readOpenGroupId(
  groups: NavGroup[],
  storageValue: string | null,
): string | null {
  const validIds = new Set(groups.map((group) => group.id));
  const defaultId =
    groups.find((group) => group.defaultOpen)?.id ?? groups[0]?.id ?? null;

  if (!storageValue) return defaultId;

  try {
    const parsed: unknown = JSON.parse(storageValue);

    if (typeof parsed === 'string') {
      return validIds.has(parsed) ? parsed : defaultId;
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const map = parsed as Record<string, boolean>;
      const openIds = Object.entries(map)
        .filter(([, open]) => open)
        .map(([id]) => id)
        .filter((id) => validIds.has(id));

      if (openIds.length === 0) return null;
      // Preferência: grupo defaultOpen se estiver aberto; senão o primeiro.
      const preferred = groups.find(
        (group) => group.defaultOpen && openIds.includes(group.id),
      );
      return preferred?.id ?? openIds[0] ?? null;
    }
  } catch {
    // Valor legado simples (id sem JSON)
    if (validIds.has(storageValue)) return storageValue;
  }

  return defaultId;
}

export function nextExclusiveOpenId(
  currentOpenId: string | null,
  toggledGroupId: string,
): string | null {
  return currentOpenId === toggledGroupId ? null : toggledGroupId;
}

/**
 * Accordion exclusivo: apenas um grupo aberto por vez.
 * Persiste o grupo aberto em localStorage e abre o grupo da rota ativa.
 */
export function useSidebarAccordion(
  groups: NavGroup[],
  activeGroupIds: string[],
) {
  const [openGroupId, setOpenGroupId] = React.useState<string | null>(() => {
    const routeGroupId = activeGroupIds[0] ?? null;
    if (routeGroupId) return routeGroupId;

    if (typeof window === 'undefined') {
      return (
        groups.find((group) => group.defaultOpen)?.id ?? groups[0]?.id ?? null
      );
    }

    return readOpenGroupId(
      groups,
      localStorage.getItem(SIDEBAR_ACCORDION_STORAGE_KEY),
    );
  });

  const activeKey = activeGroupIds.slice().sort().join(',');
  const [prevActiveKey, setPrevActiveKey] = React.useState(activeKey);

  if (activeKey !== prevActiveKey) {
    setPrevActiveKey(activeKey);
    const routeGroupId = activeGroupIds[0] ?? null;
    if (routeGroupId && openGroupId !== routeGroupId) {
      setOpenGroupId(routeGroupId);
    }
  }

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (openGroupId == null) {
      localStorage.removeItem(SIDEBAR_ACCORDION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      SIDEBAR_ACCORDION_STORAGE_KEY,
      JSON.stringify(openGroupId),
    );
  }, [openGroupId]);

  const isOpen = React.useCallback(
    (groupId: string) => openGroupId === groupId,
    [openGroupId],
  );

  const toggle = React.useCallback((groupId: string) => {
    setOpenGroupId((prev) => nextExclusiveOpenId(prev, groupId));
  }, []);

  const setOpen = React.useCallback((groupId: string, open: boolean) => {
    setOpenGroupId((prev) => {
      if (open) return groupId;
      if (prev === groupId) return null;
      return prev;
    });
  }, []);

  return {isOpen, toggle, setOpen, openGroupId};
}
