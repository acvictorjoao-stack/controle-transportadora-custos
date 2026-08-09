import Link from 'next/link';
import {KeyRound} from 'lucide-react';

import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {buttonVariants} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {listMasterBusinessRoles} from '@/features/master/roles';
import {cn} from '@/lib/utils';

export default async function MasterRolesPage() {
  let roles: Awaited<ReturnType<typeof listMasterBusinessRoles>> = [];
  let error: string | null = null;

  try {
    roles = await listMasterBusinessRoles();
  } catch (fetchError) {
    error =
      fetchError instanceof Error
        ? fetchError.message
        : 'Erro ao carregar roles.';
  }

  return (
    <PageTemplate
      title="Roles e permissões"
      description="Catálogo de perfis de negócio da plataforma. Administradores de empresa apenas atribuem estes perfis."
    >
      <Section>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {roles.map((role) => (
              <li
                key={role.name}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium">{role.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ~{role.permissionCount} permissões · {role.companyCount}{' '}
                      empresa(s)
                    </p>
                  </div>
                </div>
                <Link
                  href={ROUTES.masterRoleDetail(role.name)}
                  className={cn(buttonVariants({variant: 'outline', size: 'sm'}))}
                >
                  Editar permissões
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </PageTemplate>
  );
}
