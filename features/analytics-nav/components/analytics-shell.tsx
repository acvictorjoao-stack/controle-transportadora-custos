'use client';

import type {ReactNode} from 'react';

import {cn} from '@/lib/utils';

import type {
  AnalyticsExportPayload,
  AnalyticsModuleId,
  AnalyticsRelatedInsight,
  SharedAnalyticsFilters,
} from '../types';
import {AnalyticsExportToolbar} from './analytics-export-toolbar';
import {AnalyticsRelatedInsights} from './analytics-related-insights';
import {AnalyticsRelatedPanel} from './analytics-related-panel';

export interface AnalyticsShellProps {
  filters: SharedAnalyticsFilters;
  currentModule: AnalyticsModuleId;
  basePath: string;
  filenameBase: string;
  exportPayload: AnalyticsExportPayload;
  insights?: AnalyticsRelatedInsight[];
  crossLinks?: Array<{label: string; href: string}>;
  children: ReactNode;
  className?: string;
}

/**
 * Layout padrão das análises: toolbar (export/share/cross-nav) +
 * conteúdo + painel Relacionados + comparativos.
 */
function AnalyticsShell({
  filters,
  currentModule,
  basePath,
  filenameBase,
  exportPayload,
  insights = [],
  crossLinks = [],
  children,
  className,
}: AnalyticsShellProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <AnalyticsExportToolbar
        filters={filters}
        basePath={basePath}
        filenameBase={filenameBase}
        payload={exportPayload}
        crossLinks={crossLinks}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-6">{children}</div>
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <AnalyticsRelatedPanel
            filters={filters}
            currentModule={currentModule}
          />
        </aside>
      </div>

      <AnalyticsRelatedInsights insights={insights} />
    </div>
  );
}

export {AnalyticsShell};
