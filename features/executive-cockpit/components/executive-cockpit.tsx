import {Suspense, type ReactNode} from 'react';

import {Section} from '@/components/layout/section';

import type {ExecutiveCockpitData} from '../types';
import {FavoriteCharts} from './favorite-charts-panel';
import {GoalsConfigForm} from './goals-config-form';
import {GoalsPanel} from './goals-panel';
import {InsightsPanel} from './insights-panel';
import {OperationalScoreCard} from './operational-score-card';
import {PeriodComparatives} from './period-comparatives';
import {SmartKpiCards} from './smart-kpi-cards';
import {TrendsPanel} from './trends-panel';
import {WidgetCustomizer} from './widget-customizer';

export interface ExecutiveCockpitProps {
  data: ExecutiveCockpitData;
}

function ExecutiveCockpit({data}: ExecutiveCockpitProps) {
  const hidden = new Set(data.preferences.hiddenWidgets);
  const yearAgoNote = data.yearAgoSnapshot
    ? 'mesmo período do ano anterior'
    : null;

  const widgets: Record<string, ReactNode> = {
    comparatives: (
      <Suspense
        key="comparatives"
        fallback={
          <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
        }
      >
        <PeriodComparatives active={data.periodPreset} />
      </Suspense>
    ),
    kpis: <SmartKpiCards key="kpis" kpis={data.kpis} />,
    score: <OperationalScoreCard key="score" score={data.score} />,
    goals: (
      <GoalsPanel
        key="goals"
        goals={data.goals}
        footer={<GoalsConfigForm goals={data.goalsConfig} />}
      />
    ),
    trends: (
      <TrendsPanel
        key="trends"
        trends={data.trends}
        yearAgoNote={yearAgoNote}
      />
    ),
    insights: <InsightsPanel key="insights" insights={data.insights} />,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Section
          title="Cockpit Executivo"
          description="Indicadores diários com metas, tendências e insights."
          className="gap-1"
        />
        <WidgetCustomizer preferences={data.preferences} />
      </div>

      {data.preferences.widgetOrder
        .filter((id) => !hidden.has(id))
        .map((id) => widgets[id])}

      <FavoriteCharts charts={data.favoriteCharts} />
    </div>
  );
}

export {ExecutiveCockpit};
