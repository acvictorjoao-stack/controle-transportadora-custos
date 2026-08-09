import Link from 'next/link';
import {ArrowRight, Building2, Shield} from 'lucide-react';

import {AuthLayout} from '@/components/layout/auth-layout';
import {ROUTES} from '@/constants/routes/paths';
import {clearMasterActingCompany} from '@/lib/auth/master-company-context';
import {cn} from '@/lib/utils';
import {createClient} from '@/supabase/server';

const optionClassName = cn(
  'flex h-auto w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4 text-left shadow-xs transition-colors',
  'hover:bg-accent hover:text-accent-foreground',
);

export default async function AcessoPage() {
  const supabase = await createClient();
  await clearMasterActingCompany(supabase);

  return (
    <AuthLayout>
      <div className="space-y-8 text-center">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">FleetControl</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Como deseja acessar?
          </h1>
          <p className="text-sm text-muted-foreground">
            Você está autenticado como Master da plataforma.
          </p>
        </div>

        <div className="grid gap-3">
          <Link href={ROUTES.master} className={cn(optionClassName, 'border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground')}>
            <span className="flex items-center gap-3">
              <Shield className="size-5 shrink-0" />
              <span>
                <span className="block font-semibold">Portal Master</span>
                <span className="block text-xs font-normal opacity-90">
                  Administração da plataforma
                </span>
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 opacity-80" />
          </Link>

          <Link href={ROUTES.acessoEmpresas} className={optionClassName}>
            <span className="flex items-center gap-3">
              <Building2 className="size-5 shrink-0" />
              <span>
                <span className="block font-semibold">Acessar uma empresa</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Abrir o dashboard de uma transportadora
                </span>
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 opacity-80" />
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
