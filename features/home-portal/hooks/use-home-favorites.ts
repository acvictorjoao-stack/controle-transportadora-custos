'use client';

import {useCallback, useEffect, useState} from 'react';

import {
  HOME_FAVORITES_STORAGE_KEY,
} from '@/constants/app/home-portal';
import {useAuth} from '@/contexts/auth/use-auth';

import {DEFAULT_HOME_FAVORITES} from '../config/modules';
import type {HomeShortcutItem} from '../types';

function storageKey(userId: string | undefined): string {
  return userId
    ? `${HOME_FAVORITES_STORAGE_KEY}:${userId}`
    : HOME_FAVORITES_STORAGE_KEY;
}

function readFavorites(userId: string | undefined): HomeShortcutItem[] {
  if (typeof window === 'undefined') return DEFAULT_HOME_FAVORITES;

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_HOME_FAVORITES;
    const parsed = JSON.parse(raw) as HomeShortcutItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_HOME_FAVORITES;
    }
    return parsed.filter(
      (item) =>
        typeof item?.id === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.href === 'string',
    );
  } catch {
    return DEFAULT_HOME_FAVORITES;
  }
}

/**
 * Favoritos da Home — persistidos por usuário no localStorage.
 */
export function useHomeFavorites() {
  const {user} = useAuth();
  const [favorites, setFavorites] = useState<HomeShortcutItem[]>(
    DEFAULT_HOME_FAVORITES,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFavorites(readFavorites(user?.id));
    setReady(true);
  }, [user?.id]);

  const saveFavorites = useCallback(
    (next: HomeShortcutItem[]) => {
      setFavorites(next);
      try {
        localStorage.setItem(storageKey(user?.id), JSON.stringify(next));
      } catch {
        // ignore quota / private mode
      }
    },
    [user?.id],
  );

  const resetFavorites = useCallback(() => {
    saveFavorites(DEFAULT_HOME_FAVORITES);
  }, [saveFavorites]);

  return {favorites, ready, saveFavorites, resetFavorites};
}
