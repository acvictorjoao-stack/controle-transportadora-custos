'use client';

import {useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';

import {flattenNavItems, navigationGroups} from '@/config/navigation';
import {filterNavByPermissions} from '@/lib/navigation/filter-nav';
import {useNavPermissions} from '@/hooks/use-nav-permissions';
import type {NavItem} from '@/types/global/navigation';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca de módulos a partir da navegação filtrada por permissão.
 */
export function useModuleSearch(limit = 8) {
  const router = useRouter();
  const permissions = useNavPermissions();
  const [query, setQuery] = useState('');

  const modules = useMemo(() => {
    const groups = filterNavByPermissions(navigationGroups, permissions);
    return flattenNavItems(groups).filter((item) => !item.disabled);
  }, [permissions]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [] as NavItem[];

    return modules
      .filter((item) => {
        const haystack = normalize(
          `${item.title} ${item.description ?? ''} ${item.href}`,
        );
        return haystack.includes(q);
      })
      .slice(0, limit);
  }, [modules, query, limit]);

  const openModule = (href: string) => {
    setQuery('');
    router.push(href);
  };

  const prefetchModule = (href: string) => {
    router.prefetch(href);
  };

  return {query, setQuery, results, openModule, prefetchModule, modules};
}
