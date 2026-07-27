import {
  getModulePageMeta,
  type ModulePageId,
} from '@/config/modules/page-registry';
import {ModulePlaceholderContent} from '@/components/pages/module-placeholder-content';
import {PageTemplate} from '@/components/layout/page-template';
import {ROUTES} from '@/constants/routes/paths';

export interface ModulePageProps {
  moduleId: ModulePageId;
}

function ModulePage({moduleId}: ModulePageProps) {
  const {title, description, href} = getModulePageMeta(moduleId);
  const isDashboardModule = href.startsWith(ROUTES.dashboard);

  return (
    <PageTemplate
      title={title}
      description={description}
      breadcrumbItems={
        isDashboardModule
          ? [
              {label: 'Dashboard', href: ROUTES.dashboard},
              {label: title},
            ]
          : undefined
      }
    >
      <ModulePlaceholderContent />
    </PageTemplate>
  );
}

export {ModulePage};
