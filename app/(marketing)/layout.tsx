import {MarketingLayout} from '@/components/layout/marketing-layout';

export default function MarketingGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingLayout>{children}</MarketingLayout>;
}
