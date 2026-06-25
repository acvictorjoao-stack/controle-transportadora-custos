import {TenantLayout} from '@/components/layout/tenant-layout';

export default function TenantGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantLayout>{children}</TenantLayout>;
}
