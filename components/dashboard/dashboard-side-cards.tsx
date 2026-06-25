import {AlertsCard} from '@/components/dashboard/alerts-card';
import {RecentActivitiesCard} from '@/components/dashboard/recent-activities-card';
import {UpcomingDueCard} from '@/components/dashboard/upcoming-due-card';

function DashboardSideCards() {
  return (
    <div className="flex flex-col gap-4">
      <AlertsCard />
      <RecentActivitiesCard />
      <UpcomingDueCard />
    </div>
  );
}

export {DashboardSideCards};
