'use client';

import {siteConfig} from '@/config/site/index';
import {SHELL_FALLBACKS} from '@/constants/app/shell';
import {useAuth} from '@/contexts/auth/use-auth';

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
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{siteConfig.name}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        Bem-vindo, {name}.
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        O que deseja acessar hoje?
      </p>
      <div className="mt-5">
        <HomeModuleSearch />
      </div>
    </div>
  );
}

export {HomeWelcome};
