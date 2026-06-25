import {
  DashboardCharts,
  DashboardHeader,
  DashboardKpis,
  DashboardRankings,
  DashboardSideCards,
} from '@/components/dashboard';
import {ContentContainer} from '@/components/layout/content-container';
import {Section} from '@/components/layout/section';

export default function DashboardPage() {
  return (
    <ContentContainer>
      <DashboardHeader />

      <Section>
        <DashboardKpis />
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <DashboardCharts />
          <DashboardRankings />
        </div>
        <DashboardSideCards />
      </div>
    </ContentContainer>
  );
}
