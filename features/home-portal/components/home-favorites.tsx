'use client';

import Link from 'next/link';
import {Star} from 'lucide-react';

import {Section} from '@/components/layout/section';
import {cn} from '@/lib/utils';

import {useHomeFavorites} from '../hooks/use-home-favorites';

export interface HomeFavoritesProps {
  className?: string;
}

function HomeFavorites({className}: HomeFavoritesProps) {
  const {favorites} = useHomeFavorites();

  return (
    <Section
      title="Favoritos"
      description="Atalhos configurados para o seu usuário."
      className={className}
    >
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {favorites.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium',
                'transition-colors hover:border-primary/40 hover:bg-accent/40',
              )}
            >
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-500" />
              <span className="truncate">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export {HomeFavorites};
