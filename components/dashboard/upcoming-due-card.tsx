import type {DashboardDueItemData} from '@/features/organization/dashboard/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface UpcomingDueCardProps {
  upcomingDue: DashboardDueItemData[];
}

function UpcomingDueCard({upcomingDue}: UpcomingDueCardProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Próximos Vencimentos</CardTitle>
        <CardDescription>Obrigações financeiras nos próximos dias</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingDue.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum vencimento próximo.</p>
        )}
        {upcomingDue.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.dueDate}</p>
            </div>
            <p
              className="shrink-0 font-financial text-sm font-semibold"
              data-financial="true"
            >
              {item.amount}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export {UpcomingDueCard};
