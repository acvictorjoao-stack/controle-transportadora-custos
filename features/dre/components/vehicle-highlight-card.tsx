'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {formatCurrencyBr} from '@/features/financial/utils/financial-format';
import type {VehicleHighlightItem} from '@/features/organization/dashboard/utils/rankings';
import {cn} from '@/lib/utils';

export interface VehicleHighlightCardProps {
  title: string;
  description: string;
  item: VehicleHighlightItem | null;
  emptyMessage: string;
  valueTone?: 'default' | 'destructive';
}

function VehicleHighlightCard({
  title,
  description,
  item,
  emptyMessage,
  valueTone = 'default',
}: VehicleHighlightCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!item ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-1">
            <p className="truncate text-sm font-medium">{item.name}</p>
            <p
              className={cn(
                'font-financial text-xl font-semibold',
                valueTone === 'destructive' || item.value < 0
                  ? 'text-destructive'
                  : undefined,
              )}
            >
              {formatCurrencyBr(item.value)}
            </p>
            {item.secondaryLabel ? (
              <p className="text-xs text-muted-foreground">
                {item.secondaryLabel}: {item.secondaryValue ?? '—'}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export {VehicleHighlightCard};
