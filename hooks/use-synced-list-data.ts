'use client';

import * as React from 'react';

type ListLike<T extends {id: string}> = {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

/**
 * Estado local sincronizado com props RSC — evita router.refresh() após CRUD simples.
 */
export function useSyncedListData<D extends ListLike<{id: string}>>(
  initialData: D,
) {
  type T = D['items'][number];

  const [data, setData] = React.useState(initialData);
  const [prevInitial, setPrevInitial] = React.useState(initialData);

  if (initialData !== prevInitial) {
    setPrevInitial(initialData);
    setData(initialData);
  }

  const removeItem = React.useCallback((id: string) => {
    setData((prev) => {
      const items = prev.items.filter((item) => item.id !== id);
      const total = Math.max(0, (prev.total ?? prev.items.length) - 1);
      const pageSize = prev.pageSize ?? Math.max(items.length, 1);
      return {
        ...prev,
        items,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    });
  }, []);

  const patchItem = React.useCallback((id: string, patch: Partial<T>) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? ({...item, ...patch} as T) : item,
      ),
    }));
  }, []);

  const upsertItem = React.useCallback((item: T) => {
    setData((prev) => {
      const exists = prev.items.some((row) => row.id === item.id);
      if (exists) {
        return {
          ...prev,
          items: prev.items.map((row) => (row.id === item.id ? item : row)),
        };
      }
      const items = [item, ...prev.items];
      const total = (prev.total ?? prev.items.length) + 1;
      const pageSize = prev.pageSize ?? Math.max(items.length, 1);
      return {
        ...prev,
        items,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    });
  }, []);

  return {data, setData, removeItem, patchItem, upsertItem};
}
