import {AlertsCard} from '@/components/dashboard/alerts-card';
import {RecentActivitiesCard} from '@/components/dashboard/recent-activities-card';
import {UpcomingDueCard} from '@/components/dashboard/upcoming-due-card';
import type {CompanyDashboardData} from '@/features/organization/dashboard/types';

export interface DashboardSideCardsProps {
  alerts: CompanyDashboardData['alerts'];
  activities: CompanyDashboardData['activities'];
  upcomingDue: CompanyDashboardData['upcomingDue'];
}

function DashboardSideCards({alerts, activities, upcomingDue}: DashboardSideCardsProps) {
  return (
    <div className="flex flex-col gap-4">
      <AlertsCard alerts={alerts} />
      <RecentActivitiesCard activities={activities} />
      <UpcomingDueCard upcomingDue={upcomingDue} />
    </div>
  );
}

export {DashboardSideCards};
