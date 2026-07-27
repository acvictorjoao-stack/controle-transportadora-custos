'use client';

import Link from 'next/link';

import {Section} from '@/components/layout/section';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {hasPermission, useNavPermissions} from '@/hooks/use-nav-permissions';
import {cn} from '@/lib/utils';

import {homePortalModules} from '../config/modules';

export interface HomeModuleGridProps {
  className?: string;
}

function HomeModuleGrid({className}: HomeModuleGridProps) {
  const permissions = useNavPermissions();
  const modules = homePortalModules.filter((module) =>
    hasPermission(module.permission, permissions),
  );

  return (
    <Section
      title="Módulos"
      description="Cada card abre o primeiro módulo do grupo."
      className={className}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.id} href={module.href} className="group block">
              <Card
                className={cn(
                  'h-full transition-colors',
                  'group-hover:border-primary/40 group-hover:bg-accent/30',
                )}
              >
                <CardHeader className="gap-2 pb-4">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

export {HomeModuleGrid};
