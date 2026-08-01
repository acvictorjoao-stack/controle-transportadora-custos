'use client';

import Link from 'next/link';
import {ArrowRight} from 'lucide-react';

import {useNavigationPending} from '@/contexts/navigation/use-navigation-pending';
import {cn} from '@/lib/utils';

import {HOME_MODULE_ACCENT_STYLES} from '../config/modules';
import type {HomeModuleCard} from '../types';

export interface HomeModuleCardViewProps {
  module: HomeModuleCard;
}

function HomeModuleCardView({module}: HomeModuleCardViewProps) {
  const Icon = module.icon;
  const accent = HOME_MODULE_ACCENT_STYLES[module.accent];
  const {isPending, startNavigation} = useNavigationPending();
  const pending = isPending(module.href);

  return (
    <Link
      href={module.href}
      prefetch
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
      className="group block h-full"
      onClick={() => startNavigation(module.href)}
    >
      <article
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card',
          'transition-all duration-200 ease-out',
          'group-hover:-translate-y-1 group-hover:shadow-lg',
          pending && 'ring-2 ring-primary/40',
        )}
      >
        <div className={cn('h-1.5 w-full shrink-0', accent.bar)} />

        <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-xl',
              accent.iconWrap,
            )}
          >
            <Icon className={cn('size-6', accent.icon)} />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight text-card-foreground">
              {module.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {module.description}
            </p>
          </div>

          <div
            className={cn(
              'mt-auto inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium',
              'bg-background transition-all duration-200',
              accent.cta,
              pending && 'opacity-80',
            )}
          >
            {pending ? 'Abrindo…' : 'Acessar'}
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </article>
    </Link>
  );
}

export {HomeModuleCardView};
