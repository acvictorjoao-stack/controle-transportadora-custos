'use client';

import {useCallback, useEffect, useState} from 'react';
import {usePathname} from 'next/navigation';

import {
  HOME_RECENTS_MAX,
  HOME_RECENTS_STORAGE_KEY,
} from '@/constants/app/home-portal';
import {flattenNavItems, navigationGroups} from '@/config/navigation';
import {ROUTES} from '@/constants/routes/paths';
import {useAuth} from '@/contexts/auth/use-auth';

import {DEFAULT_HOME_RECENTS} from '../config/modules';
import type {HomeShortcutItem} from '../types';

const EXCLUDED_PATHS = new Set([ROUTES.home, '/home', ROUTES.login]);

function storageKey(userId: string | undefined): string {
  return userId
    ? `${HOME_RECENTS_STORAGE_KEY}:${userId}`
    : HOME_RECENTS_STORAGE_KEY;
}

function resolveTitle(pathname: string): string | null {
  const items = flattenNavItems(navigationGroups);
  const exact = items.find((item) => item.href === pathname);
  if (exact) return exact.title;

  const prefix = items
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return prefix?.title ?? null;
}

function isTrackablePath(pathname: string): boolean {
  if (!pathname || EXCLUDED_PATHS.has(pathname)) return false;
  if (pathname.startsWith('/api')) return false;
  if (pathname.startsWith('/master')) return false;
  if (pathname.startsWith('/login')) return false;
  return true;
}

function readRecents(userId: string | undefined): HomeShortcutItem[] {
  if (typeof window === 'undefined') return DEFAULT_HOME_RECENTS;

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_HOME_RECENTS;
    const parsed = JSON.parse(raw) as HomeShortcutItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_HOME_RECENTS;
    }
    return parsed.filter(
      (item) =>
        typeof item?.id === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.href === 'string',
    );
  } catch {
    return DEFAULT_HOME_RECENTS;
  }
}

function writeRecents(userId: string | undefined, items: HomeShortcutItem[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Recentes da Home — lê o histórico persistido por usuário.
 */
export function useHomeRecents() {
  const {user} = useAuth();
  const [recents, setRecents] = useState<HomeShortcutItem[]>(DEFAULT_HOME_RECENTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecents(readRecents(user?.id));
    setReady(true);
  }, [user?.id]);

  return {recents, ready};
}

/**
 * Tracker global: registra rotas visitadas como recentes.
 * Montar uma vez no AppShell.
 */
export function useTrackHomeRecents() {
  const pathname = usePathname();
  const {user} = useAuth();

  const pushRecent = useCallback(
    (href: string, title: string) => {
      const current = readRecents(user?.id).filter((item) => item.href !== href);
      const next: HomeShortcutItem[] = [
        {id: href, title, href},
        ...current,
      ].slice(0, HOME_RECENTS_MAX);
      writeRecents(user?.id, next);
    },
    [user?.id],
  );

  useEffect(() => {
    if (!pathname || !isTrackablePath(pathname)) return;

    const title = resolveTitle(pathname);
    if (!title) return;

    // Normaliza para a rota do módulo (sem IDs de detalhe)
    const items = flattenNavItems(navigationGroups);
    const match =
      items.find((item) => item.href === pathname) ??
      items
        .filter((item) => pathname.startsWith(`${item.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0];

    if (!match || match.disabled) return;

    pushRecent(match.href, match.title);
  }, [pathname, pushRecent]);
}
