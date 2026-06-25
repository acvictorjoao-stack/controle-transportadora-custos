import {BarChart3} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';

export interface ChartPlaceholderProps {
  title: string;
  description: string;
  variant?: 'bar' | 'line' | 'area';
  className?: string;
}

const barHeights = [40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 48, 90];

function ChartPlaceholder({
  title,
  description,
  variant = 'bar',
  className,
}: ChartPlaceholderProps) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="relative flex h-52 items-end justify-between gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 p-4 xl:h-60 2xl:h-72"
          aria-label={`Gráfico: ${title} — integração futura`}
        >
          {variant === 'bar' &&
            barHeights.map((height, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/20 transition-colors"
                style={{height: `${height}%`}}
              />
            ))}
          {variant === 'line' && (
            <div className="flex size-full items-center justify-center">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>
          )}
          {variant === 'area' && (
            <div className="flex size-full flex-col justify-end gap-1">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-16 w-3/4 rounded-lg" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-lg bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
              <BarChart3 className="size-3.5" />
              Integração futura
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export {ChartPlaceholder};
