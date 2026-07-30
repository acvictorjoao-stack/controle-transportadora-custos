'use client';

import {SHELL_FALLBACKS} from '@/constants/app/shell';
import {useAuth} from '@/contexts/auth/use-auth';
import {cn} from '@/lib/utils';

import {HomeModuleSearch} from './home-module-search';

function firstName(fullName: string | undefined): string {
  if (!fullName?.trim()) return SHELL_FALLBACKS.userName;
  return fullName.trim().split(/\s+/)[0] ?? SHELL_FALLBACKS.userName;
}

export interface HomeWelcomeProps {
  className?: string;
}

function HomeWelcome({className}: HomeWelcomeProps) {
  const {user} = useAuth();
  const name = firstName(user?.name);

  return (
    <header className={cn('mx-auto flex w-full max-w-2xl flex-col gap-5 text-center', className)}>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Bem-vindo, {name}.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          O que deseja acessar hoje? Busque um módulo ou escolha um card abaixo.
        </p>
      </div>

      <HomeModuleSearch className="mx-auto w-full max-w-xl text-left" />
    </header>
  );
}

export {HomeWelcome};
