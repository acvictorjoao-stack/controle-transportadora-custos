'use client';

import * as React from 'react';

import {PageTemplate} from '@/components/layout/page-template';
import {cn} from '@/lib/utils';
import {getDisplayName} from '@/features/master/companies/utils/format';

import type {CompanyProfile} from '../types';
import {CompanyProfileForm} from './company-profile-form';
import {CompanySettingsForm} from './company-settings-form';
import {TabsNav} from '@/components/ui/tabs-nav';

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
      <TabsNav items={TABS} value={activeTab} onChange={setActiveTab} className="mb-4" />

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
