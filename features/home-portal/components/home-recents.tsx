'use client';

import Link from 'next/link';
import {Clock3} from 'lucide-react';

import {Section} from '@/components/layout/section';
import {cn} from '@/lib/utils';

import {useHomeRecents} from '../hooks/use-home-recents';

export interface HomeRecentsProps {
  className?: string;
}

function HomeRecents({className}: HomeRecentsProps) {
  const {recents} = useHomeRecents();

  return (
    <Section
      title="Acessados recentemente"
      description="Módulos visitados nesta sessão e nas anteriores."
      className={className}
    >
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {recents.map((item) => (
          <li key={`${item.id}-${item.href}`}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium',
                'transition-colors hover:border-primary/40 hover:bg-accent/40',
              )}
            >
              <Clock3 className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export {HomeRecents};
