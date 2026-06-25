import * as React from 'react';

import {ActionBar, type ActionBarProps} from '@/components/layout/action-bar';
import {Breadcrumb} from '@/components/layout/breadcrumb/breadcrumb';
import {ContentContainer} from '@/components/layout/content-container';
import {PageHeader, type PageHeaderProps} from '@/components/layout/page-header';

export interface PageTemplateProps {
  title: string;
  description?: string;
  badge?: PageHeaderProps['badge'];
  actions?: PageHeaderProps['actions'];
  actionBar?: Pick<ActionBarProps, 'leading' | 'trailing' | 'children'>;
  showBreadcrumb?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Template padrão para páginas internas do FleetControl.
 * Utilizado por todos os módulos para manter consistência visual e estrutural.
 */
function PageTemplate({
  title,
  description,
  badge,
  actions,
  actionBar,
  showBreadcrumb = true,
  className,
  children,
}: PageTemplateProps) {
  const hasActionBar =
    actionBar &&
    (actionBar.leading || actionBar.trailing || actionBar.children);

  return (
    <ContentContainer className={className}>
      {showBreadcrumb && <Breadcrumb />}
      <PageHeader
        title={title}
        description={description}
        badge={badge}
        actions={actions}
      />
      {hasActionBar && (
        <ActionBar leading={actionBar.leading} trailing={actionBar.trailing}>
          {actionBar.children}
        </ActionBar>
      )}
      {children}
    </ContentContainer>
  );
}

export {PageTemplate};
