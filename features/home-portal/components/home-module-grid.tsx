'use client';

import {hasPermission, useNavPermissions} from '@/hooks/use-nav-permissions';
import {cn} from '@/lib/utils';

import {homePortalModules} from '../config/modules';
import {HomeModuleCardView} from './home-module-card';

export interface HomeModuleGridProps {
  className?: string;
}

function HomeModuleGrid({className}: HomeModuleGridProps) {
  const permissions = useNavPermissions();
  const modules = homePortalModules.filter((module) =>
    hasPermission(module.permission, permissions),
  );

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <HomeModuleCardView key={module.id} module={module} />
        ))}
      </div>
    </section>
  );
}

export {HomeModuleGrid};
