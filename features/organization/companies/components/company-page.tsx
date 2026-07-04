'use client';

import * as React from 'react';

import {PageTemplate} from '@/components/layout/page-template';
import {cn} from '@/lib/utils';
import {getDisplayName} from '@/features/master/companies/utils/format';

import type {CompanyProfile} from '../types';
import {CompanyProfileForm} from './company-profile-form';
import {CompanySettingsForm} from './company-settings-form';

type TabId = 'dados' | 'configuracoes';

export interface CompanyPageProps {
  company: CompanyProfile;
  initialTab?: TabId;
}

const TABS: {id: TabId; label: string}[] = [
  {id: 'dados', label: 'Dados da Empresa'},
  {id: 'configuracoes', label: 'Configurações'},
];

function CompanyPage({company: initialCompany, initialTab = 'dados'}: CompanyPageProps) {
  const [company, setCompany] = React.useState(initialCompany);
  const [activeTab, setActiveTab] = React.useState<TabId>(initialTab);

  const displayName = getDisplayName(company.legalName, company.tradeName);

  return (
    <PageTemplate
      title="Empresa"
      description={`Cadastro e configurações de ${displayName}`}
    >
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dados' && (
        <CompanyProfileForm company={company} onSaved={setCompany} />
      )}
      {activeTab === 'configuracoes' && (
        <CompanySettingsForm company={company} onSaved={setCompany} />
      )}
    </PageTemplate>
  );
}

export {CompanyPage};
