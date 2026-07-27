import Link from 'next/link';
import {ArrowDownRight} from 'lucide-react';

import {Section} from '@/components/layout/section';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {cn} from '@/lib/utils';

import type {HomePendingItem} from '../types';

export interface HomePendingCardsProps {
  items: HomePendingItem[];
  className?: string;
}

function HomePendingCards({items, className}: HomePendingCardsProps) {
  return (
    <Section
      title="Pendências"
      description="Itens que pedem atenção operacional."
      className={className}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="group block">
            <Card
              className={cn(
                'h-full py-4 transition-colors',
                'group-hover:border-primary/40 group-hover:bg-accent/30',
              )}
            >
              <CardHeader className="gap-1 px-4 pb-0">
                <CardDescription>{item.title}</CardDescription>
                <CardTitle className="text-3xl tabular-nums tracking-tight">
                  {item.count}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-1 px-4 pt-3 text-sm text-primary">
                <ArrowDownRight className="size-3.5" />
                {item.actionLabel}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </Section>
  );
}

export {HomePendingCards};
