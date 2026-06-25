import {
  getModulePageMeta,
  type ModulePageId,
} from '@/config/modules/page-registry';
import {ModulePlaceholderContent} from '@/components/pages/module-placeholder-content';
import {PageTemplate} from '@/components/layout/page-template';

export interface ModulePageProps {
  moduleId: ModulePageId;
}

function ModulePage({moduleId}: ModulePageProps) {
  const {title, description} = getModulePageMeta(moduleId);

  return (
    <PageTemplate title={title} description={description}>
      <ModulePlaceholderContent />
    </PageTemplate>
  );
}

export {ModulePage};
