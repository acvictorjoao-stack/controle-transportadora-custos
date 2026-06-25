import {dashboardMock} from '@/components/dashboard/mock-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function RecentActivitiesCard() {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
        <CardDescription>Últimas movimentações do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dashboardMock.activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start justify-between gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">{activity.title}</p>
              <p className="text-xs text-muted-foreground">{activity.description}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {activity.time}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export {RecentActivitiesCard};
