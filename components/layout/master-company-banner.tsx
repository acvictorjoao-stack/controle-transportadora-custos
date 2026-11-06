'use client';

import {useTransition} from 'react';
import {ArrowLeftRight, Shield} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {
  goToMasterCompanySwitcherAction,
  returnToMasterPortalAction,
} from '@/features/master/company-access';

interface MasterCompanyBannerProps {
  companyName: string;
}

export function MasterCompanyBanner({companyName}: MasterCompanyBannerProps) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      data-slot="master-company-banner"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2.5 text-sm lg:px-6"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Shield className="size-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            Master
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Empresa: {companyName}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => goToMasterCompanySwitcherAction())}
        >
          <ArrowLeftRight className="size-3.5" />
          Trocar empresa
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => returnToMasterPortalAction())}
        >
          Voltar ao Portal Master
        </Button>
      </div>
    </div>
  );
}
