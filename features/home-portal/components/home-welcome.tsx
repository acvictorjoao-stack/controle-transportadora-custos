'use client';

import {SHELL_FALLBACKS} from '@/constants/app/shell';
import {useAuth} from '@/contexts/auth/use-auth';
import {cn} from '@/lib/utils';

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
    <header className={cn('mx-auto w-full max-w-2xl text-center', className)}>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Bem-vindo, {name}.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
        O que deseja acessar hoje?
      </p>
    </header>
  );
}

export {HomeWelcome};
