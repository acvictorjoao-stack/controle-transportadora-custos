import type {DashboardRankingItem} from '@/components/dashboard/ranking-types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';

export interface RankingCardProps {
  title: string;
  description: string;
  items: DashboardRankingItem[];
}

function RankingCard({title, description, items}: RankingCardProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados no período.</p>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
            >
              <Badge
                variant={index === 0 ? 'default' : 'secondary'}
                className="size-7 shrink-0 justify-center rounded-full p-0"
              >
                {index + 1}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              <p
                className="shrink-0 font-financial text-sm font-semibold"
                data-financial="true"
              >
                {item.value}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export {RankingCard};
