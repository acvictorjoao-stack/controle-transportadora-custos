import Link from 'next/link';
import {notFound} from 'next/navigation';

import {MasterRolePermissionsEditor} from '@/components/master/roles/master-role-permissions-editor';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {ROUTES} from '@/constants/routes/paths';
import {getMasterRolePermissionMatrix} from '@/features/master/roles';
import {isBusinessRoleName} from '@/features/organization/members/business-roles';

interface MasterRoleDetailPageProps {
  params: Promise<{name: string}>;
}

export default async function MasterRoleDetailPage({
  params,
}: MasterRoleDetailPageProps) {
  const {name: rawName} = await params;
  const roleName = decodeURIComponent(rawName);

  if (!isBusinessRoleName(roleName)) {
    notFound();
  }

  const matrix = await getMasterRolePermissionMatrix(roleName);
  if (!matrix) {
    notFound();
  }

  return (
    <PageTemplate
      title={matrix.roleName}
      description={matrix.description}
      actions={
        <Link
          href={ROUTES.masterRoles}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Voltar para roles
        </Link>
      }
    >
      <Section>
        <p className="mb-4 text-sm text-muted-foreground">
          Alterações são aplicadas a todas as empresas que possuem este perfil.
          Administradores de empresa não editam esta matriz.
        </p>
        <MasterRolePermissionsEditor
          roleName={matrix.roleName}
          permissions={matrix.permissions}
          initialSelectedCodes={matrix.selectedCodes}
        />
      </Section>
    </PageTemplate>
  );
}
