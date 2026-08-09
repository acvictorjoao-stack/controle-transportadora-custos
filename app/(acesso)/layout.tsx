import {requireOwner} from '@/lib/auth/guards';

export default async function AcessoGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();
  return children;
}
