'use client';

import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

import type {AnalyticsRelatedInsight} from '../types';

export interface AnalyticsRelatedInsightsProps {
  insights: AnalyticsRelatedInsight[];
  className?: string;
}

function AnalyticsRelatedInsights({
  insights,
  className,
}: AnalyticsRelatedInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          Também relacionado
        </h2>
        <p className="text-sm text-muted-foreground">
          Comparativos rápidos derivados do contexto atual.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {insights.map((insight) => (
          <Link key={insight.id} href={insight.href} className="group block">
            <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/30">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between gap-2">
                  <span>{insight.title}</span>
                  <ArrowUpRight className="size-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                </CardDescription>
                <CardTitle className="text-base leading-snug">
                  {insight.label}
                </CardTitle>
              </CardHeader>
              {insight.subtitle ? (
                <CardContent className="pt-0">
                  <p className="font-financial text-sm text-muted-foreground">
                    {insight.subtitle}
                  </p>
                </CardContent>
              ) : null}
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export {AnalyticsRelatedInsights};
