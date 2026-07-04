'use client';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  GitBranch,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {Alert, AlertDescription} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

import {completeOnboardingAction} from '../../companies/actions';
import {CompanyProfileForm} from '../../companies/components/company-profile-form';
import {LogoUpload} from '../../companies/components/logo-upload';
import type {CompanyProfile} from '../../companies/types';
import type {Branch, PaginatedBranches} from '../../branches/types';
import {BranchFormModal} from '../../branches/components/branch-form-modal';
import {cn} from '@/lib/utils';

type Step = 'empresa' | 'logo' | 'filiais' | 'finalizar';

const STEPS: {id: Step; label: string; icon: React.ElementType}[] = [
  {id: 'empresa', label: 'Empresa', icon: Building2},
  {id: 'logo', label: 'Logo', icon: ImageIcon},
  {id: 'filiais', label: 'Filiais', icon: GitBranch},
  {id: 'finalizar', label: 'Finalizar', icon: CheckCircle2},
];

export interface OnboardingWizardProps {
  company: CompanyProfile;
  branches: PaginatedBranches;
}

function OnboardingWizard({company: initialCompany, branches: initialBranches}: OnboardingWizardProps) {
  const router = useRouter();
  const [company, setCompany] = React.useState(initialCompany);
  const [branches] = React.useState(initialBranches);
  const [step, setStep] = React.useState<Step>('empresa');
  const [branchModalOpen, setBranchModalOpen] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  async function handleComplete() {
    setCompleting(true);
    setError(null);

    const result = await completeOnboardingAction();
    if (!result.success) {
      setError(result.error);
      setCompleting(false);
      return;
    }

    router.refresh();
  }

  function handleBranchSaved() {
    router.refresh();
    setBranchModalOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card shadow-lg">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Configuração inicial</h2>
          <p className="text-sm text-muted-foreground">
            Complete o cadastro da sua transportadora para começar a usar o FleetControl.
          </p>
          <div className="mt-4 flex gap-2">
            {STEPS.map((s, index) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium',
                    index <= stepIndex
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'empresa' && (
            <CompanyProfileForm company={company} onSaved={setCompany} />
          )}

          {step === 'logo' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Envie a logomarca da sua empresa. Este passo é opcional.
              </p>
              <LogoUpload
                companyId={company.id}
                logoUrl={company.logoUrl}
                onUploaded={(url) => setCompany((prev) => ({...prev, logoUrl: url}))}
              />
            </div>
          )}

          {step === 'filiais' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirme ou cadastre as filiais da transportadora. A filial matriz já foi criada automaticamente.
              </p>
              <ul className="space-y-2">
                {branches.items.map((branch: Branch) => (
                  <li
                    key={branch.id}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                  >
                    <div>
                      <span className="font-medium">{branch.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {branch.code}
                      </span>
                      {branch.isHeadquarters && (
                        <span className="ml-2 text-xs text-primary">Matriz</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" onClick={() => setBranchModalOpen(true)}>
                Adicionar filial
              </Button>
            </div>
          )}

          {step === 'finalizar' && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto size-12 text-primary" />
              <h3 className="text-lg font-semibold">Tudo pronto!</h3>
              <p className="text-sm text-muted-foreground">
                Sua empresa está configurada. Clique em concluir para acessar o sistema.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={stepIndex === 0}
            onClick={() => setStep(STEPS[stepIndex - 1].id)}
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Button>

          {step !== 'finalizar' ? (
            <Button
              size="sm"
              onClick={() => setStep(STEPS[stepIndex + 1].id)}
            >
              Próximo
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button size="sm" disabled={completing} onClick={handleComplete}>
              {completing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Concluir configuração
            </Button>
          )}
        </div>
      </div>

      <BranchFormModal
        open={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        onSaved={handleBranchSaved}
      />
    </div>
  );
}

export {OnboardingWizard};
